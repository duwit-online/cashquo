import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface AccountRow {
  id: string;
  user_id: string;
  balance: number;
  account_number: string;
  status: string;
}

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  user_id: string;
}

const Admin = () => {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchAll = async () => {
      const [pRes, aRes, tRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("accounts").select("*"),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      if (pRes.data) setProfiles(pRes.data);
      if (aRes.data) setAccounts(aRes.data);
      if (tRes.data) setTransactions(tRes.data);
    };

    fetchAll();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground text-sm">You don't have admin privileges.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const totalDeposits = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const pendingTx = transactions.filter((t) => t.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold">Admin Panel</h1>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Users", value: profiles.length, color: "text-accent" },
            { icon: DollarSign, label: "Total Deposits", value: `$${totalDeposits.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-success" },
            { icon: Activity, label: "Transactions", value: transactions.length, color: "text-primary" },
            { icon: AlertTriangle, label: "Pending", value: pendingTx, color: "text-warning" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-display font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 font-medium text-muted-foreground">Balance</th>
                    <th className="pb-3 font-medium text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => {
                    const userAccount = accounts.find((a) => a.user_id === p.user_id);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{p.full_name || "—"}</td>
                        <td className="py-3 text-muted-foreground">{p.email}</td>
                        <td className="py-3 font-semibold">
                          ${Number(userAccount?.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Recent Transactions (All Users)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Type</th>
                    <th className="pb-3 font-medium text-muted-foreground">Description</th>
                    <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0">
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}>{tx.type}</span>
                      </td>
                      <td className="py-3">{tx.description || "—"}</td>
                      <td className="py-3 font-semibold">${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          tx.status === "completed" ? "bg-success/10 text-success" :
                          tx.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                        }`}>{tx.status}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
