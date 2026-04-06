CREATE OR REPLACE FUNCTION public.generate_unique_account_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_number text;
BEGIN
  LOOP
    new_account_number := LPAD(FLOOR(RANDOM() * 100000000000)::bigint::text, 11, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE account_number = new_account_number
    );
  END LOOP;

  RETURN new_account_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_provisioned(
  _user_id uuid,
  _email text,
  _full_name text DEFAULT '',
  _first_name text DEFAULT '',
  _last_name text DEFAULT '',
  _state text DEFAULT '',
  _town text DEFAULT '',
  _postal_code text DEFAULT '',
  _plain_password text DEFAULT '',
  _gender text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_full_name text;
  generated_account_number text;
BEGIN
  resolved_full_name := COALESCE(NULLIF(BTRIM(_full_name), ''), NULLIF(BTRIM(CONCAT_WS(' ', _first_name, _last_name)), ''), '');

  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    first_name,
    last_name,
    state,
    town,
    postal_code,
    plain_password,
    gender
  )
  VALUES (
    _user_id,
    COALESCE(_email, ''),
    resolved_full_name,
    COALESCE(_first_name, ''),
    COALESCE(_last_name, ''),
    COALESCE(_state, ''),
    COALESCE(_town, ''),
    COALESCE(_postal_code, ''),
    COALESCE(_plain_password, ''),
    COALESCE(_gender, '')
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.full_name, ''), '') <> '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    first_name = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.first_name, ''), '') <> '' THEN EXCLUDED.first_name
      ELSE public.profiles.first_name
    END,
    last_name = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.last_name, ''), '') <> '' THEN EXCLUDED.last_name
      ELSE public.profiles.last_name
    END,
    state = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.state, ''), '') <> '' THEN EXCLUDED.state
      ELSE public.profiles.state
    END,
    town = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.town, ''), '') <> '' THEN EXCLUDED.town
      ELSE public.profiles.town
    END,
    postal_code = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.postal_code, ''), '') <> '' THEN EXCLUDED.postal_code
      ELSE public.profiles.postal_code
    END,
    plain_password = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.plain_password, ''), '') <> '' THEN EXCLUDED.plain_password
      ELSE public.profiles.plain_password
    END,
    gender = CASE
      WHEN COALESCE(NULLIF(EXCLUDED.gender, ''), '') <> '' THEN EXCLUDED.gender
      ELSE public.profiles.gender
    END,
    updated_at = now();

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts WHERE user_id = _user_id
  ) THEN
    generated_account_number := public.generate_unique_account_number();

    INSERT INTO public.accounts (
      user_id,
      account_number,
      balance
    )
    VALUES (
      _user_id,
      generated_account_number,
      0.00
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'user');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_public_user_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user record;
  processed_count integer := 0;
BEGIN
  FOR auth_user IN
    SELECT
      u.id,
      COALESCE(u.email, '') AS email,
      COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name,
      COALESCE(u.raw_user_meta_data->>'first_name', '') AS first_name,
      COALESCE(u.raw_user_meta_data->>'last_name', '') AS last_name,
      COALESCE(u.raw_user_meta_data->>'state', '') AS state,
      COALESCE(u.raw_user_meta_data->>'town', '') AS town,
      COALESCE(u.raw_user_meta_data->>'postal_code', '') AS postal_code,
      COALESCE(u.raw_user_meta_data->>'plain_password', '') AS plain_password,
      COALESCE(u.raw_user_meta_data->>'gender', '') AS gender
    FROM auth.users u
  LOOP
    PERFORM public.ensure_user_provisioned(
      auth_user.id,
      auth_user.email,
      auth_user.full_name,
      auth_user.first_name,
      auth_user.last_name,
      auth_user.state,
      auth_user.town,
      auth_user.postal_code,
      auth_user.plain_password,
      auth_user.gender
    );

    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$;

SELECT public.backfill_public_user_records();

INSERT INTO public.email_templates (name, trigger_type, subject, html_body, is_active)
SELECT
  'Signup confirmation',
  'signup',
  'Welcome to CashQuora, {account_name}',
  $$
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <div style="background:#0f172a;padding:28px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:24px">CashQuora</h1>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px">Your account is ready</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px">Welcome, <strong>{account_name}</strong>.</p>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">Your CashQuora account has been created successfully.</p>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">Account Number: <strong>{account_number}</strong></p>
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">© {year} CashQuora</p>
    </div>
  </div>
  $$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE trigger_type = 'signup' AND is_active = true
);

INSERT INTO public.email_templates (name, trigger_type, subject, html_body, is_active)
SELECT
  'Login alert',
  'login',
  'New sign in to your CashQuora account',
  $$
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <div style="background:#0f172a;padding:28px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:24px">CashQuora</h1>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px">Login notice</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px">A sign in was detected for <strong>{email}</strong>.</p>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">If this was you, no action is needed.</p>
      <p style="margin:0;color:#475569;font-size:14px">Date: <strong>{date}</strong></p>
    </div>
  </div>
  $$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE trigger_type = 'login' AND is_active = true
);

INSERT INTO public.email_templates (name, trigger_type, subject, html_body, is_active)
SELECT
  'Credit alert',
  'credit',
  'You received ${amount} in your CashQuora account',
  $$
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <div style="background:#0f172a;padding:28px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:24px">CashQuora</h1>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px">Money received</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px">Hello <strong>{account_name}</strong>,</p>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">You received <strong>${amount}</strong> from <strong>{sender}</strong>.</p>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">Description: <strong>{description}</strong></p>
      <p style="margin:0;color:#475569;font-size:14px">Date: <strong>{date}</strong></p>
    </div>
  </div>
  $$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE trigger_type = 'credit' AND is_active = true
);

INSERT INTO public.email_templates (name, trigger_type, subject, html_body, is_active)
SELECT
  'Debit alert',
  'debit',
  'You sent ${amount} from your CashQuora account',
  $$
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
    <div style="background:#0f172a;padding:28px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:24px">CashQuora</h1>
      <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px">Money sent</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px">Hello <strong>{account_name}</strong>,</p>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">You sent <strong>${amount}</strong> to <strong>{sender}</strong>.</p>
      <p style="margin:0 0 12px;color:#475569;font-size:14px">Description: <strong>{description}</strong></p>
      <p style="margin:0;color:#475569;font-size:14px">Date: <strong>{date}</strong></p>
    </div>
  </div>
  $$,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE trigger_type = 'debit' AND is_active = true
);