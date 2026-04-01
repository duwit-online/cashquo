import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownLeft, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

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

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setTransactions(data as Transaction[]); });
  }, [user]);

  const filtered = transactions.filter((tx) => {
    const matchesSearch = !search || tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.recipient?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || tx.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Transaction History</h1>
          <p className="text-sm text-muted-foreground mt-1">View and search all your transactions</p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["all", "credit", "debit"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  filter === f ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "all" ? "All" : f === "credit" ? "Received" : "Sent"}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No transactions found</p>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${tx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {tx.type === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{tx.description || "Transaction"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`text-sm font-bold tabular-nums ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                          {tx.type === "credit" ? "+" : "-"}${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

export default Transactions;
