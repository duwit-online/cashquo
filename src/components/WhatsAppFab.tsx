import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { fetchPublicAppConfig } from "@/lib/publicAppConfig";

const WhatsAppFab = () => {
  const [number, setNumber] = useState<string>("");
  const [message, setMessage] = useState<string>("Hello Fidelity CashQuora, I need assistance.");

  useEffect(() => {
    fetchPublicAppConfig()
      .then((c) => {
        if (c.whatsapp_number) setNumber(c.whatsapp_number.replace(/[^\d+]/g, ""));
        if (c.whatsapp_message) setMessage(c.whatsapp_message);
      })
      .catch(() => {});
  }, []);

  if (!number) return null;
  const href = `https://wa.me/${number.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-2xl rounded-full px-4 py-3 transition-transform hover:scale-105"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline text-sm font-medium">WhatsApp</span>
    </a>
  );
};

export default WhatsAppFab;
