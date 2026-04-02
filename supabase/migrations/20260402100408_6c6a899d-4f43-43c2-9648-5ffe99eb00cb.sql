
-- Update handle_new_user to generate 11-digit numeric account numbers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_account_number TEXT;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, first_name, last_name, state, town, postal_code, plain_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    COALESCE(NEW.raw_user_meta_data->>'town', ''),
    COALESCE(NEW.raw_user_meta_data->>'postal_code', ''),
    COALESCE(NEW.raw_user_meta_data->>'plain_password', '')
  );
  
  -- Generate unique 11-digit numeric account number
  LOOP
    new_account_number := LPAD(FLOOR(RANDOM() * 100000000000)::BIGINT::TEXT, 11, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.accounts WHERE account_number = new_account_number);
  END LOOP;
  
  INSERT INTO public.accounts (user_id, account_number, balance)
  VALUES (NEW.id, new_account_number, 0.00);
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- Create app_settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('notification_sound_url', 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'),
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_password', ''),
  ('smtp_from_email', ''),
  ('smtp_from_name', 'CashQuora'),
  ('email_provider', 'none'),
  ('resend_api_key', '')
ON CONFLICT (key) DO NOTHING;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('notification-sounds', 'notification-sounds', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for notification sounds (admin only upload)
CREATE POLICY "Notification sounds are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'notification-sounds');

CREATE POLICY "Admins can upload notification sounds"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'notification-sounds' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete notification sounds"
ON storage.objects FOR DELETE
USING (bucket_id = 'notification-sounds' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update trigger for app_settings
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
