
-- Fix any legacy non-numeric account numbers
UPDATE public.accounts
SET account_number = LPAD(FLOOR(RANDOM() * 100000000000)::BIGINT::TEXT, 11, '0')
WHERE account_number !~ '^\d{11}$';

-- Create verify_account_number function (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.verify_account_number(acct_num TEXT)
RETURNS TABLE(holder_name TEXT, account_exists BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(p.full_name, TRIM(p.first_name || ' ' || p.last_name), 'Account holder') AS holder_name,
    TRUE AS account_exists
  FROM public.accounts a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.account_number = acct_num
  LIMIT 1;
$$;

-- Create email trigger type enum
CREATE TYPE public.email_trigger_type AS ENUM (
  'signup', 'login', 'credit', 'debit', 'reversal', 'account_statement', 'new_login'
);

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  trigger_type public.email_trigger_type NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create email_logs table
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL DEFAULT '',
  trigger_type public.email_trigger_type NOT NULL,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email logs"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default email templates
INSERT INTO public.email_templates (name, trigger_type, subject, html_body) VALUES
('Welcome Email', 'signup', 'Welcome to CashQuora, {account_name}!', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:#0f172a;padding:32px;text-align:center"><h1 style="color:#fff;font-size:24px;margin:0">CashQuora</h1></div><div style="padding:32px"><h2 style="color:#0f172a">Welcome, {account_name}!</h2><p style="color:#64748b">Your account has been created successfully.</p><p style="color:#64748b">Account Number: <strong>{account_number}</strong></p><p style="color:#94a3b8;font-size:12px">© {year} CashQuora</p></div></div>'),
('Login Alert', 'login', 'New Login to Your CashQuora Account', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:#0f172a;padding:32px;text-align:center"><h1 style="color:#fff;font-size:24px;margin:0">CashQuora</h1></div><div style="padding:32px"><h2 style="color:#0f172a">Login Detected</h2><p style="color:#64748b">A new login was detected on your account on {date}.</p><p style="color:#64748b">If this was not you, please contact support immediately.</p><p style="color:#94a3b8;font-size:12px">© {year} CashQuora</p></div></div>'),
('Money Received', 'credit', 'You received ${amount} on CashQuora', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:#0f172a;padding:32px;text-align:center"><h1 style="color:#fff;font-size:24px;margin:0">CashQuora</h1></div><div style="padding:32px"><div style="text-align:center;margin-bottom:24px"><div style="display:inline-block;background:#ecfdf5;color:#059669;padding:12px 24px;border-radius:12px;font-size:32px;font-weight:bold">+${amount}</div></div><h2 style="color:#0f172a;text-align:center">Money Received!</h2><p style="color:#64748b;text-align:center">{sender} sent you <strong>${amount}</strong></p><p style="color:#64748b">Transaction ID: {transaction_id}</p><p style="color:#64748b">Date: {date}</p><p style="color:#64748b">Description: {description}</p><p style="color:#94a3b8;font-size:12px;text-align:center">© {year} CashQuora</p></div></div>'),
('Money Sent', 'debit', 'You sent ${amount} on CashQuora', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:#0f172a;padding:32px;text-align:center"><h1 style="color:#fff;font-size:24px;margin:0">CashQuora</h1></div><div style="padding:32px"><div style="text-align:center;margin-bottom:24px"><div style="display:inline-block;background:#fef2f2;color:#dc2626;padding:12px 24px;border-radius:12px;font-size:32px;font-weight:bold">-${amount}</div></div><h2 style="color:#0f172a;text-align:center">Money Sent</h2><p style="color:#64748b;text-align:center">You sent <strong>${amount}</strong> to {sender}</p><p style="color:#64748b">Transaction ID: {transaction_id}</p><p style="color:#64748b">Date: {date}</p><p style="color:#94a3b8;font-size:12px;text-align:center">© {year} CashQuora</p></div></div>');
