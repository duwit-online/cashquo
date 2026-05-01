import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownLeft, Send, Plus, TrendingUp, Wallet, Eye, EyeOff, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { ROUTING_NUMBER } from "@/lib/constants";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import TopUpDetailsDialog from "@/components/TopUpDetailsDialog";
import { fetchPublicAppConfig, type PublicAppConfig } from "@/lib/publicAppConfig";
import MarketTicker from "@/components/MarketTicker";
import WhatsAppFab from "@/components/WhatsAppFab";

interface Account {
  id: string;
  account_name: string;
  account_number: string;
  balance: number;
  currency: string;
  status: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  recipient: string | null;
  status: string;
  created_at: string;
  account_id: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: "bg-success/10 text-success",
    pending: "bg-warning/10 text-warning",
    failed: "bg-destructive/10 text-destructive",
  };
  return map[status] || "bg-muted text-muted-foreground";
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null; first_name: string; last_name: string } | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [publicConfig, setPublicConfig] = useState<PublicAppConfig>({});

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [accRes, txRes, profileRes, configRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("full_name, avatar_url, first_name, last_name").eq("user_id", user.id).single(),
        fetchPublicAppConfig().catch(() => ({} as PublicAppConfig)),
      ]);
      if (accRes.data) setAccounts(accRes.data);
      if (txRes.data) setTransactions(txRes.data as Transaction[]);
      if (profileRes.data) setProfile(profileRes.data);
      setPublicConfig(configRes);
    };
    fetchData();
  }, [user]);

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const mainAccount = accounts[0];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const initials = profile ? `${profile.first_name?.charAt(0) || ""}${profile.last_name?.charAt(0) || ""}` : "";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="-mx-4 lg:-mx-6">
          <MarketTicker variant="dark" />
        </div>
        {/* Greeting with Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-accent/20">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground font-display font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl lg:text-2xl font-display font-bold text-foreground">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}{profile?.first_name ? `, ${profile.first_name}` : ""}
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">Here's your financial overview</p>
          </div>
        </div>

        {/* Balance Hero */}
        <Card className="bg-primary text-primary-foreground overflow-hidden relative border-0 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <CardContent className="p-5 lg:p-8 relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-primary-foreground/60 text-xs uppercase tracking-wider font-medium">
                <Wallet className="h-3.5 w-3.5" />
                Total Balance
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-3xl lg:text-5xl font-display font-bold mt-2">
              {showBalance ? `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••••••"}
            </p>
            {mainAccount && (
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-primary-foreground/40 uppercase tracking-wider w-16">Routing</span>
                  <span className="text-xs text-primary-foreground/70 font-mono">{ROUTING_NUMBER}</span>
                  <button onClick={() => copyToClipboard(ROUTING_NUMBER, "Routing number")} className="text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors">
                    {copied === "Routing number" ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-primary-foreground/40 uppercase tracking-wider w-16">Account</span>
                  <span className="text-xs text-primary-foreground/70 font-mono">{mainAccount.account_number}</span>
                  <button onClick={() => copyToClipboard(mainAccount.account_number, "Account number")} className="text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors">
                    {copied === "Account number" ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 mt-3 text-xs text-primary-foreground/50">
              <TrendingUp className="h-3 w-3" />
              <span>Available balance · USD</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Send, label: "Send", onClick: () => navigate("/send") },
            { icon: ArrowDownLeft, label: "Receive", onClick: () => copyToClipboard(mainAccount?.account_number || "", "Account number") },
            { icon: Plus, label: "Top Up", onClick: () => setTopUpOpen(true) },
            { icon: ArrowUpRight, label: "Pay", onClick: () => navigate("/pay") },
          ].map((action) => (
            <Card key={action.label} className="cursor-pointer hover:shadow-md transition-all hover:border-accent/30 group" onClick={action.onClick}>
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-display">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-accent text-xs h-8" onClick={() => navigate("/transactions")}>View All</Button>
            </CardHeader>
            <CardContent className="space-y-1">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No transactions yet</p>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="w-full flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${tx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {tx.type === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || "Transaction"}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                        {tx.type === "credit" ? "+" : "-"}${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Accounts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Your Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="p-4 rounded-xl bg-muted/40 border border-border hover:border-accent/20 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm font-semibold">{acc.account_name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{acc.account_number}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${acc.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {acc.status}
                    </span>
                  </div>
                  <p className="text-xl font-display font-bold">
                    {showBalance ? `$${Number(acc.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••••"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <TopUpDetailsDialog
        details={publicConfig}
        onCopy={copyToClipboard}
        onOpenChange={setTopUpOpen}
        open={topUpOpen}
      />

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-display">Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className={`inline-flex p-4 rounded-2xl mb-3 ${selectedTx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {selectedTx.type === "credit" ? <ArrowDownLeft className="h-8 w-8" /> : <ArrowUpRight className="h-8 w-8" />}
                </div>
                <p className={`text-3xl font-display font-bold ${selectedTx.type === "credit" ? "text-success" : "text-foreground"}`}>
                  {selectedTx.type === "credit" ? "+" : "-"}${Number(selectedTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${statusBadge(selectedTx.status)}`}>
                  {selectedTx.status.charAt(0).toUpperCase() + selectedTx.status.slice(1)}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ["Description", selectedTx.description || "—"],
                  ["Type", selectedTx.type === "credit" ? "Credit (Incoming)" : "Debit (Outgoing)"],
                  ["Recipient", selectedTx.recipient || "—"],
                  ["Date", format(new Date(selectedTx.created_at), "MMMM d, yyyy")],
                  ["Time", format(new Date(selectedTx.created_at), "h:mm:ss a")],
                  ["Transaction ID", selectedTx.id.slice(0, 8).toUpperCase()],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right max-w-[200px] truncate">{value}</span>
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

export default Dashboard;
