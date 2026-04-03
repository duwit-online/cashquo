import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const NotificationSoundProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadDone = useRef(false);

  // Load sound URL
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "notification_sound_url")
      .maybeSingle()
      .then(({ data }) => {
        const url = data?.value || "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg";
        audioRef.current = new Audio(url);
        audioRef.current.volume = 0.5;
        // Preload
        audioRef.current.load();
      });
  }, []);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    // Wait a tick so initial page load notifications don't trigger sound
    const timeout = setTimeout(() => {
      initialLoadDone.current = true;
    }, 3000);

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (initialLoadDone.current) {
            // Play sound
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
            const notif = payload.new as { title: string; message: string };
            toast(notif.title, { description: notif.message });
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return <>{children}</>;
};

export default NotificationSoundProvider;
