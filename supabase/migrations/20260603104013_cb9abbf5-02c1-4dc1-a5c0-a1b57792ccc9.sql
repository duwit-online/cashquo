CREATE TABLE public.admin_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_uid text NOT NULL,
  from_address text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  to_address text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_uid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_inbox TO authenticated;
GRANT ALL ON public.admin_inbox TO service_role;

ALTER TABLE public.admin_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view inbox" ON public.admin_inbox
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inbox" ON public.admin_inbox
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inbox" ON public.admin_inbox
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_inbox_received ON public.admin_inbox (received_at DESC);
