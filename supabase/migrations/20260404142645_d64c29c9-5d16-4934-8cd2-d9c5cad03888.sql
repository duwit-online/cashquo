
-- Add gender column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '';

-- Update handle_new_user to include gender and return account number for email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_account_number TEXT;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, first_name, last_name, state, town, postal_code, plain_password, gender)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'town', ''),
    COALESCE(NEW.raw_user_meta_data->>'postal_code', ''),
    COALESCE(NEW.raw_user_meta_data->>'plain_password', ''),
    COALESCE(NEW.raw_user_meta_data->>'gender', '')
  );
  
  LOOP
    new_account_number := LPAD(FLOOR(RANDOM() * 100000000000)::BIGINT::TEXT, 11, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.accounts WHERE account_number = new_account_number);
  END LOOP;
  
  INSERT INTO public.accounts (user_id, account_number, balance)
  VALUES (NEW.id, new_account_number, 0.00);
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;
