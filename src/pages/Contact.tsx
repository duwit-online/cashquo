import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Landmark, Phone, MapPin, Mail, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchPublicAppConfig, type PublicAppConfig } from "@/lib/publicAppConfig";
import WhatsAppFab from "@/components/WhatsAppFab";
import MarketTicker from "@/components/MarketTicker";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Message too short").max(2000),
});

const Contact = () => {
  const [cfg, setCfg] = useState<PublicAppConfig>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPublicAppConfig().then(setCfg).catch(() => {});
  }, []);

  const phone = cfg.contact_phone || "+1 (628) 262-7372";
  const address = cfg.contact_address || "345 California St, Ste. 1600, San Francisco, CA 94104";
  const email = cfg.contact_email || "";
  const wa = cfg.whatsapp_number?.replace(/[^\d+]/g, "") || "";
  const waHref = wa
    ? `https://wa.me/${wa.replace(/^\+/, "")}?text=${encodeURIComponent(cfg.whatsapp_message || "Hello")}`
    : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || "",
      subject: parsed.data.subject || "",
      message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Message sent. Our team will be in touch.");
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Fidelity CashQuora</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <MarketTicker variant="light" />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <header className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-3">Contact us</h1>
          <p className="text-muted-foreground max-w-2xl">
            Questions about your account, transfers, or anything else? Our team is here 24/7.
          </p>
        </header>

        <div className="grid lg:grid-cols-5 gap-8">
          <aside className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Phone</p>
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="font-semibold hover:text-primary">{phone}</a>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Headquarters</p>
                  <p className="font-medium leading-snug">{address}</p>
                </div>
              </div>
              {email && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Email</p>
                    <a href={`mailto:${email}`} className="font-semibold hover:text-primary">{email}</a>
                  </div>
                </div>
              )}
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] hover:bg-[#1ebe57] text-white py-3 font-medium transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  Chat on WhatsApp
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-bold mb-2">Hours</h3>
              <p className="text-sm text-muted-foreground">Customer support is available 24 hours a day, 7 days a week.</p>
            </div>
          </aside>

          <form onSubmit={submit} className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
            <h2 className="text-2xl font-display font-bold mb-4">Send us a message</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={200} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} />
            </div>
            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Submit message"}
            </Button>
          </form>
        </div>
      </main>

      <footer className="border-t border-border mt-12 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fidelity CashQuora. All rights reserved.
      </footer>

      <WhatsAppFab />
    </div>
  );
};

export default Contact;
