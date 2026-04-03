import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, BellRing, ArrowDownLeft, ArrowUpRight, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  transaction_id: string | null;
  created_at: string;
}

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selected, setSelected] = useState<Notification | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadDone = useRef(false);
  const soundUrlRef = useRef<string>("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");

  // Load notification sound URL from app_settings
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "notification_sound_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          soundUrlRef.current = data.value;
        }
        audioRef.current = new Audio(soundUrlRef.current);
        audioRef.current.volume = 0.5;
      });
  }, []);

  const playSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  };

  useEffect(() => {
    if (!user) return;

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setNotifications(data as Notification[]);
        initialLoadDone.current = true;
      });

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          if (initialLoadDone.current) {
            playSound();
            toast(newNotif.title, { description: newNotif.message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notif: Notification) => {
    if (notif.is_read) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
    setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const openNotification = (notif: Notification) => {
    setSelected(notif);
    markAsRead(notif);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <Card
                key={notif.id}
                className={`cursor-pointer transition-all hover:shadow-md ${!notif.is_read ? "border-accent/30 bg-accent/5" : ""}`}
                onClick={() => openNotification(notif)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    notif.type === "credit" ? "bg-success/10 text-success" :
                    notif.type === "debit" ? "bg-destructive/10 text-destructive" :
                    "bg-accent/10 text-accent"
                  }`}>
                    {notif.type === "credit" ? <ArrowDownLeft className="h-4 w-4" /> :
                     notif.type === "debit" ? <ArrowUpRight className="h-4 w-4" /> :
                     <BellRing className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notif.is_read ? "font-bold" : "font-medium"}`}>{notif.title}</p>
                      {!notif.is_read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">{format(new Date(notif.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-display">Notification Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className={`inline-flex p-4 rounded-2xl mb-3 ${
                  selected.type === "credit" ? "bg-success/10 text-success" :
                  selected.type === "debit" ? "bg-destructive/10 text-destructive" :
                  "bg-accent/10 text-accent"
                }`}>
                  {selected.type === "credit" ? <ArrowDownLeft className="h-8 w-8" /> :
                   selected.type === "debit" ? <ArrowUpRight className="h-8 w-8" /> :
                   <BellRing className="h-8 w-8" />}
                </div>
                <h3 className="text-xl font-display font-bold">{selected.title}</h3>
              </div>
              <div className="bg-muted/40 rounded-xl p-4">
                <p className="text-sm leading-relaxed">{selected.message}</p>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["Type", selected.type === "credit" ? "Money Received" : selected.type === "debit" ? "Money Sent" : "Info"],
                  ["Date", format(new Date(selected.created_at), "MMMM d, yyyy")],
                  ["Time", format(new Date(selected.created_at), "h:mm:ss a")],
                  ["Status", selected.is_read ? "Read" : "Unread"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Notifications;
