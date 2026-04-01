import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Lock, Snowflake, Wifi, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const Cards = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<{ account_number: string; balance: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("accounts").select("account_number, balance").eq("user_id", user.id).limit(1).single()
      .then(({ data }) => { if (data) setAccount(data); });
  }, [user]);

  const lastFour = account?.account_number?.slice(-4) || "0000";

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">My Card</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your CashQuora virtual card</p>
        </div>

        {/* Virtual Card - premium design */}
        <div className="relative rounded-2xl bg-gradient-to-br from-primary via-primary to-accent/80 text-primary-foreground p-6 lg:p-8 overflow-hidden shadow-2xl aspect-[1.6/1] max-w-md mx-auto">
          {/* Background patterns */}
          <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
          <div className="absolute top-4 right-6 flex items-center gap-1.5">
            <Wifi className="h-5 w-5 text-primary-foreground/40 rotate-90" />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              <span className="text-sm font-display font-bold tracking-wide">CashQuora</span>
            </div>

            <div>
              <div className="w-10 h-7 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md mb-4 border border-yellow-400/50" />
              <p className="text-lg lg:text-xl font-mono tracking-[0.25em] mb-4">
                •••• •••• •••• {lastFour}
              </p>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-primary-foreground/50 uppercase tracking-widest">Card Holder</p>
                <p className="text-sm font-semibold mt-0.5">{user?.user_metadata?.full_name || user?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-primary-foreground/50 uppercase tracking-widest">Valid Thru</p>
                <p className="text-sm font-semibold mt-0.5">12/28</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card actions */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-warning/10 text-warning">
                <Snowflake className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Freeze Card</p>
                <p className="text-xs text-muted-foreground">Temporarily disable</p>
              </div>
              <Button variant="outline" size="sm">Freeze</Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Change PIN</p>
                <p className="text-xs text-muted-foreground">Update security</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Cards;
