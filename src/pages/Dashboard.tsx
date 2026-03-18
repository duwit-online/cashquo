import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, Send, Plus, TrendingUp, Wallet, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
}

const Dashboard = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [accRes, txRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user.id),
        supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (accRes.data) setAccounts(accRes.data);
      if (txRes.data) setTransactions(txRes.data);
    };

    fetchData();
  }, [user]);

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your financial overview</p>
        </div>

        {/* Balance Hero Card */}
        <Card className="bg-primary text-primary-foreground overflow-hidden relative">
          <CardContent className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <Wallet className="h-4 w-4" />
                Total Balance
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="text-primary-foreground/70 hover:text-primary-foreground">
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-3xl lg:text-4xl font-display font-bold">
              {showBalance ? `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••••"}
            </p>
            <div className="flex items-center gap-1 mt-2 text-sm text-primary-foreground/70">
              <TrendingUp className="h-3 w-3" />
              <span>+2.4% from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Send, label: "Send", color: "text-accent" },
            { icon: ArrowDownLeft, label: "Receive", color: "text-accent" },
            { icon: Plus, label: "Top Up", color: "text-accent" },
            { icon: ArrowUpRight, label: "Pay", color: "text-accent" },
          ].map((action) => (
            <Card key={action.label} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <div className={`p-2 rounded-lg bg-accent/10 ${action.color}`}>
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
              <CardTitle className="text-lg font-display">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm" className="text-accent text-xs">View All</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {tx.type === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description || "Transaction"}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                        {tx.type === "credit" ? "+" : "-"}${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        tx.status === "completed" ? "bg-success/10 text-success" :
                        tx.status === "pending" ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Accounts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Your Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium">{acc.account_name}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_number}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success font-medium">{acc.status}</span>
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
    </DashboardLayout>
  );
};

export default Dashboard;
