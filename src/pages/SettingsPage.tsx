import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, MapPin, Phone, Mail, Copy, CheckCircle2 } from "lucide-react";
import { ROUTING_NUMBER } from "@/lib/constants";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const SettingsPage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ full_name: "", phone: "", first_name: "", last_name: "", state: "", town: "", postal_code: "", avatar_url: "" });
  const [loading, setLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setProfile({
        full_name: data.full_name || "",
        phone: data.phone || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        state: data.state || "",
        town: data.town || "",
        postal_code: data.postal_code || "",
        avatar_url: data.avatar_url || "",
      });
    });
    supabase.from("accounts").select("account_number").eq("user_id", user.id).limit(1).single()
      .then(({ data }) => { if (data) setAccountNumber(data.account_number); });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone,
        first_name: profile.first_name,
        last_name: profile.last_name,
        state: profile.state,
        town: profile.town,
        postal_code: profile.postal_code,
      })
      .eq("user_id", user.id);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated!");
    setLoading(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const initials = `${profile.first_name?.charAt(0) || ""}${profile.last_name?.charAt(0) || ""}`;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
        </div>

        {/* Account info with avatar */}
        <Card className="bg-muted/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16 border-2 border-accent/20">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground font-display font-bold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-lg truncate">{profile.first_name} {profile.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-background border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Routing Number</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono font-medium">{ROUTING_NUMBER}</p>
                  <button onClick={() => copyToClipboard(ROUTING_NUMBER, "Routing")} className="text-muted-foreground hover:text-foreground transition-colors">
                    {copied === "Routing" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-background border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Account Number</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono font-medium">{accountNumber}</p>
                  <button onClick={() => copyToClipboard(accountNumber, "Account")} className="text-muted-foreground hover:text-foreground transition-colors">
                    {copied === "Account" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-display flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name</Label>
                <Input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-display flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">City / Town</Label>
                <Input value={profile.town} onChange={(e) => setProfile({ ...profile, town: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Zip Code</Label>
                <Input value={profile.postal_code} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
