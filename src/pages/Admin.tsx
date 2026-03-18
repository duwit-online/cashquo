import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, DollarSign, Activity, AlertTriangle, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  state: string;
  town: string;
  postal_code: string;
  plain_password: string;
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
  const { isAdmin, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Edit user state
  const [editingUser, setEditingUser] = useState<ProfileRow | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    state: "",
    town: "",
    postal_code: "",
    plain_password: "",
  });

  // View user state
  const [viewingUser, setViewingUser] = useState<ProfileRow | null>(null);

  // Create user state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    state: "",
    town: "",
    postal_code: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchAll = async () => {
    setDataLoading(true);
    const [pRes, aRes, tRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("accounts").select("*"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (pRes.data) setProfiles(pRes.data as unknown as ProfileRow[]);
    if (aRes.data) setAccounts(aRes.data);
    if (tRes.data) setTransactions(tRes.data);
    setDataLoading(false);
  };

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    fetchAll();
  }, [isAdmin, authLoading]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

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

  // Create user via edge function
  const handleCreateUser = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: createForm,
      });
      if (error) throw error;
      toast.success("User created successfully");
      setCreateOpen(false);
      setCreateForm({ first_name: "", last_name: "", email: "", password: "", state: "", town: "", postal_code: "" });
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
    setCreating(false);
  };

  // Update user profile
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        full_name: `${editForm.first_name} ${editForm.last_name}`.trim(),
        email: editForm.email,
        state: editForm.state,
        town: editForm.town,
        postal_code: editForm.postal_code,
        plain_password: editForm.plain_password,
      })
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Failed to update user");
    } else {
      toast.success("User updated");
      setEditingUser(null);
      await fetchAll();
    }
  };

  // Delete user profile (and cascade)
  const handleDeleteUser = async (profile: ProfileRow) => {
    // Delete profile, account, transactions
    await Promise.all([
      supabase.from("transactions").delete().eq("user_id", profile.user_id),
      supabase.from("accounts").delete().eq("user_id", profile.user_id),
      supabase.from("user_roles").delete().eq("user_id", profile.user_id),
    ]);
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    if (error) {
      toast.error("Failed to delete user");
    } else {
      toast.success("User deleted");
      await fetchAll();
    }
  };

  const openEdit = (p: ProfileRow) => {
    setEditingUser(p);
    setEditForm({
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      email: p.email,
      state: p.state || "",
      town: p.town || "",
      postal_code: p.postal_code || "",
      plain_password: p.plain_password || "",
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Admin Panel</h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First Name</Label><Input value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} /></div>
                  <div><Label>Last Name</Label><Input value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} /></div>
                </div>
                <div><Label>Email</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
                <div><Label>Password</Label><Input value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></div>
                <div><Label>State</Label><Input value={createForm.state} onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Town</Label><Input value={createForm.town} onChange={(e) => setCreateForm({ ...createForm, town: e.target.value })} /></div>
                  <div><Label>Postal Code</Label><Input value={createForm.postal_code} onChange={(e) => setCreateForm({ ...createForm, postal_code: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleCreateUser} disabled={creating}>{creating ? "Creating..." : "Create User"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

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
            {dataLoading ? (
              <div className="py-8 text-center text-muted-foreground animate-pulse">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">First Name</th>
                      <th className="pb-3 font-medium text-muted-foreground">Last Name</th>
                      <th className="pb-3 font-medium text-muted-foreground">Email</th>
                      <th className="pb-3 font-medium text-muted-foreground">State</th>
                      <th className="pb-3 font-medium text-muted-foreground">Town</th>
                      <th className="pb-3 font-medium text-muted-foreground">Postal</th>
                      <th className="pb-3 font-medium text-muted-foreground">Password</th>
                      <th className="pb-3 font-medium text-muted-foreground">Balance</th>
                      <th className="pb-3 font-medium text-muted-foreground">Joined</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => {
                      const userAccount = accounts.find((a) => a.user_id === p.user_id);
                      return (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="py-3 font-medium">{p.first_name || "—"}</td>
                          <td className="py-3">{p.last_name || "—"}</td>
                          <td className="py-3 text-muted-foreground">{p.email}</td>
                          <td className="py-3">{p.state || "—"}</td>
                          <td className="py-3">{p.town || "—"}</td>
                          <td className="py-3">{p.postal_code || "—"}</td>
                          <td className="py-3 font-mono text-xs">{p.plain_password || "—"}</td>
                          <td className="py-3 font-semibold">
                            ${Number(userAccount?.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingUser(p)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {p.first_name} {p.last_name}'s profile, accounts, and transactions.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(p)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* View User Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-3 text-sm">
              {[
                ["First Name", viewingUser.first_name],
                ["Last Name", viewingUser.last_name],
                ["Email", viewingUser.email],
                ["State", viewingUser.state],
                ["Town", viewingUser.town],
                ["Postal Code", viewingUser.postal_code],
                ["Password", viewingUser.plain_password],
                ["Joined", format(new Date(viewingUser.created_at), "MMM d, yyyy")],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value || "—"}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name</Label><Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
              <div><Label>Last Name</Label><Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>State</Label><Input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Town</Label><Input value={editForm.town} onChange={(e) => setEditForm({ ...editForm, town: e.target.value })} /></div>
              <div><Label>Postal Code</Label><Input value={editForm.postal_code} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} /></div>
            </div>
            <div><Label>Password</Label><Input value={editForm.plain_password} onChange={(e) => setEditForm({ ...editForm, plain_password: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Admin;
