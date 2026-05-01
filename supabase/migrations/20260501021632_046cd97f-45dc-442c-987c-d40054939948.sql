-- Contact messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text DEFAULT '',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view contact messages"
  ON public.contact_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contact messages"
  ON public.contact_messages FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Static pages
CREATE TABLE IF NOT EXISTS public.static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read static pages"
  ON public.static_pages FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage static pages"
  ON public.static_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER static_pages_updated_at
  BEFORE UPDATE ON public.static_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default pages
INSERT INTO public.static_pages (slug, title, content) VALUES
('about', 'About Fidelity CashQuora', '<h2>About Us</h2><p>Fidelity CashQuora is a modern digital banking platform built to deliver secure, fast, and reliable financial services to individuals and businesses.</p><p>Our mission is to make money management effortless with bank-grade security and an exceptional customer experience.</p>'),
('terms', 'Terms of Service', '<h2>Terms of Service</h2><p>By using Fidelity CashQuora, you agree to comply with these terms. Please read them carefully.</p><p>Update this content from the Admin panel.</p>'),
('privacy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>Your privacy is important to us. This policy explains what data we collect and how we use it.</p><p>Update this content from the Admin panel.</p>'),
('contact', 'Contact Us', '<p>We are here to help. Reach out anytime using the form below or via the channels listed.</p>')
ON CONFLICT (slug) DO NOTHING;

-- Seed default app_settings
INSERT INTO public.app_settings (key, value) VALUES
('contact_phone', '+1 (628) 262-7372'),
('contact_address', '345 California St, Ste. 1600, San Francisco, CA 94104'),
('contact_email', ''),
('whatsapp_number', '+16282627372'),
('whatsapp_message', 'Hello Fidelity CashQuora, I need assistance.'),
('brand_name', 'Fidelity CashQuora')
ON CONFLICT (key) DO NOTHING;