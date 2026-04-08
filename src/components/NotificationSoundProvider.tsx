import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DEFAULT_NOTIFICATION_SOUND_URL, fetchPublicAppConfig } from "@/lib/publicAppConfig";

const NotificationSoundProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadDone = useRef(false);
  const soundUrlRef = useRef(DEFAULT_NOTIFICATION_SOUND_URL);
  const audioUnlocked = useRef(false);

  const buildAudio = useCallback((url: string) => {
    const audio = new Audio(url);
    audio.volume = 1;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    return audio;
  }, []);

  const loadSound = useCallback(async () => {
    try {
      const config = await fetchPublicAppConfig();
      soundUrlRef.current = config.notification_sound_url || DEFAULT_NOTIFICATION_SOUND_URL;
    } catch {
      soundUrlRef.current = DEFAULT_NOTIFICATION_SOUND_URL;
    }

    const audio = buildAudio(soundUrlRef.current);
    audioRef.current = audio;
    audio.load();
  }, [buildAudio]);

  const unlockAudio = useCallback(async () => {
    if (audioUnlocked.current || !audioRef.current) return;

    try {
      audioRef.current.muted = true;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = false;
      audioUnlocked.current = true;
    } catch {}
  }, []);

  // Load sound URL
  useEffect(() => {
    void loadSound();

    const onInteraction = () => {
      void unlockAudio();
    };

    const onFocus = () => {
      void loadSound();
    };

    window.addEventListener("pointerdown", onInteraction, { passive: true });
    window.addEventListener("keydown", onInteraction);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadSound, unlockAudio]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;
    initialLoadDone.current = false;

    // Wait a tick so initial page load notifications don't trigger sound
    const timeout = setTimeout(() => {
      initialLoadDone.current = true;
    }, 1000);

    const channel = supabase
      .channel(`global-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (initialLoadDone.current) {
            const notif = payload.new as { title: string; message: string };

            if (!audioRef.current) {
              audioRef.current = buildAudio(soundUrlRef.current);
            }

            try {
              audioRef.current.volume = 1;
              audioRef.current.muted = false;
              audioRef.current.currentTime = 0;
              await audioRef.current.play();
            } catch {
              try {
                await unlockAudio();
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
              } catch {}
            }

            toast(notif.title, { description: notif.message });
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [buildAudio, unlockAudio, user]);

  return <>{children}</>;
};

export default NotificationSoundProvider;
