
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, transaction_id)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.type = 'credit' THEN 'Money Received' ELSE 'Money Sent' END,
    CASE WHEN NEW.type = 'credit'
      THEN 'You received $' || NEW.amount::text || COALESCE(' from ' || NEW.recipient, '')
      ELSE 'You sent $' || NEW.amount::text || COALESCE(' to ' || NEW.recipient, '')
    END,
    NEW.type,
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_transaction_notify
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_transaction();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
