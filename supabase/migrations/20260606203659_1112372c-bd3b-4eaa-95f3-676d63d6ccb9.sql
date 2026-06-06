
CREATE TABLE public.admin_sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sender_id uuid,
  mode text NOT NULL DEFAULT 'custom',
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  recipients text[] NOT NULL DEFAULT '{}',
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_sent_emails TO authenticated;
GRANT ALL ON public.admin_sent_emails TO service_role;
ALTER TABLE public.admin_sent_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sent emails" ON public.admin_sent_emails FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
