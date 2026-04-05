import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, Activity, AlertTriangle, Plus, Pencil, Trash2, Eye, Wallet, ReceiptText, Volume2, Mail, Settings, Send, FileText, Clock, ShieldCheck, ShieldOff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ROUTING_NUMBER } from "@/lib/constants";

interface ProfileRow {
  id: string; user_id: string; full_name: string; first_name: string; last_name: string;
  email: string; state: string; town: string; postal_code: string; plain_password: string;
  created_at: string; avatar_url: string | null;
}
interface AccountRow { id: string; user_id: string; balance: number; account_number: string; status: string; }
interface TransactionRow { id: string; type: string; amount: number; description: string; status: string; created_at: string; user_id: string; }
interface UserRole { id: string; user_id: string; role: string; }
interface EmailTemplate { id: string; name: string; trigger_type: string; subject: string; html_body: string; is_active: boolean; created_at: string; updated_at: string; }
interface EmailTemplate { id: string; name: string; trigger_type: string; subject: string; html_body: string; is_active: boolean; created_at: string; updated_at: string; }
interface EmailLog { id: string; recipient_email: string; trigger_type: string; template_id: string | null; status: string; error_message: string | null; created_at: string; }

const TRIGGER_TYPES = ["signup", "login", "credit", "debit", "reversal", "account_statement", "new_login"];
const TEMPLATE_VARS = ["{account_name}", "{email}", "{account_number}", "{sender}", "{transaction_id}", "{date}", "{year}", "{app_logo}", "{signature}", "{amount}", "{transaction_type}", "{description}"];

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [editingUser, setEditingUser] = useState<ProfileRow | null>(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "", state: "", town: "", postal_code: "", plain_password: "" });
  const [viewingUser, setViewingUser] = useState<ProfileRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: "", last_name: "", email: "", password: "", state: "", town: "", postal_code: "" });
  const [creating, setCreating] = useState(false);
  const [balanceUser, setBalanceUser] = useState<ProfileRow | null>(null);
  const [balanceForm, setBalanceForm] = useState({ balance: "0" });
  const [savingBalance, setSavingBalance] = useState(false);
  const [transactionUser, setTransactionUser] = useState<ProfileRow | null>(null);
  const [transactionForm, setTransactionForm] = useState({ type: "credit", amount: "", description: "", status: "completed", recipient: "" });
  const [creatingTransaction, setCreatingTransaction] = useState(false);

  // Delete confirmation (double confirm)
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deletingUser, setDeletingUser] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    email_provider: "none", smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "",
    smtp_from_email: "", smtp_from_name: "CashQuora", resend_api_key: "", notification_sound_url: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [uploadingSound, setUploadingSound] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  // Email templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", trigger_type: "signup", subject: "", html_body: "", is_active: true });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Email logs
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

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

  const fetchSettings = async () => {
    const { data } = await supabase.from("app_settings").select("key, value");
    if (data) {
      const s: Record<string, string> = {};
      data.forEach((d: any) => { s[d.key] = d.value; });
      setEmailSettings((prev) => ({ ...prev, ...s }));
    }
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data as unknown as EmailTemplate[]);
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setEmailLogs(data as unknown as EmailLog[]);
  };

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    fetchAll();
    fetchSettings();
    fetchTemplates();
    fetchLogs();
  }, [isAdmin, authLoading]);

  if (authLoading) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[60vh]"><div className="animate-pulse text-muted-foreground">Loading...</div></div></DashboardLayout>;
  }
  if (!isAdmin) {
    return <DashboardLayout><div className="flex items-center justify-center min-h-[60vh]"><Card className="max-w-md w-full"><CardContent className="p-8 text-center"><AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" /><h2 className="text-xl font-display font-bold mb-2">Access Denied</h2><p className="text-muted-foreground text-sm">You don't have admin privileges.</p></CardContent></Card></div></DashboardLayout>;
  }

  const totalDeposits = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const pendingTx = transactions.filter((t) => t.status === "pending").length;

  const handleCreateUser = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: createForm });
      if (error) throw error;
      toast.success("User created successfully");
      setCreateOpen(false);
      setCreateForm({ first_name: "", last_name: "", email: "", password: "", state: "", town: "", postal_code: "" });
      await fetchAll();
    } catch (err: any) { toast.error(err.message || "Failed to create user"); }
    setCreating(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from("profiles").update({
      first_name: editForm.first_name, last_name: editForm.last_name,
      full_name: `${editForm.first_name} ${editForm.last_name}`.trim(),
      email: editForm.email, state: editForm.state, town: editForm.town,
      postal_code: editForm.postal_code, plain_password: editForm.plain_password,
    }).eq("id", editingUser.id);
    if (error) toast.error("Failed to update user");
    else { toast.success("User updated"); setEditingUser(null); await fetchAll(); }
  };

  const startDeleteUser = (p: ProfileRow) => {
    setDeletingUser(p);
    setDeleteStep(1);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const response = await supabase.functions.invoke("admin-delete-user", { body: { user_id: deletingUser.user_id } });
      console.log("Delete response:", response);
      if (response.error) throw response.error;
      const responseData = response.data;
      if (responseData?.error) throw new Error(responseData.error);
      toast.success("User permanently deleted");
      setDeletingUser(null);
      setDeleteStep(0);
      await fetchAll();
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Failed to delete user");
    }
    setDeleting(false);
  };

  const openEdit = (p: ProfileRow) => {
    setEditingUser(p);
    setEditForm({ first_name: p.first_name || "", last_name: p.last_name || "", email: p.email, state: p.state || "", town: p.town || "", postal_code: p.postal_code || "", plain_password: p.plain_password || "" });
  };

  const openBalanceEditor = (p: ProfileRow) => {
    const ua = accounts.find((a) => a.user_id === p.user_id);
    setBalanceUser(p);
    setBalanceForm({ balance: String(ua?.balance ?? 0) });
  };

  const handleUpdateBalance = async () => {
    if (!balanceUser) return;
    const ua = accounts.find((a) => a.user_id === balanceUser.user_id);
    if (!ua) { toast.error("No account found"); return; }
    setSavingBalance(true);
    const nb = Number(balanceForm.balance);
    if (Number.isNaN(nb)) { toast.error("Invalid balance"); setSavingBalance(false); return; }
    const { error } = await supabase.from("accounts").update({ balance: nb }).eq("id", ua.id);
    if (error) toast.error(error.message);
    else { toast.success("Balance updated"); setBalanceUser(null); await fetchAll(); }
    setSavingBalance(false);
  };

  const openTransactionCreator = (p: ProfileRow) => {
    setTransactionUser(p);
    setTransactionForm({ type: "credit", amount: "", description: "", status: "completed", recipient: "" });
  };

  const handleCreateTransaction = async () => {
    if (!transactionUser) return;
    const ua = accounts.find((a) => a.user_id === transactionUser.user_id);
    if (!ua) { toast.error("No account found"); return; }
    const amount = Number(transactionForm.amount);
    if (!amount || amount <= 0) { toast.error("Invalid amount"); return; }
    setCreatingTransaction(true);
    const { error: txErr } = await supabase.from("transactions").insert({
      account_id: ua.id, user_id: transactionUser.user_id, type: transactionForm.type,
      amount, description: transactionForm.description || `${transactionForm.type} by admin`,
      status: transactionForm.status, recipient: transactionForm.recipient || null,
    });
    if (txErr) { toast.error(txErr.message); setCreatingTransaction(false); return; }
    if (transactionForm.status === "completed") {
      const delta = transactionForm.type === "credit" ? amount : -amount;
      await supabase.from("accounts").update({ balance: Number(ua.balance) + delta }).eq("id", ua.id);
    }
    toast.success("Transaction created");
    setTransactionUser(null);
    setCreatingTransaction(false);
    await fetchAll();
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    for (const [key, value] of Object.entries(emailSettings)) {
      await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
    }
    toast.success("Settings saved");
    setSavingSettings(false);
  };

  const handleUploadSound = async () => {
    if (!soundFile) return;
    setUploadingSound(true);
    const ext = soundFile.name.split(".").pop();
    const path = `notification-sound-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("notification-sounds").upload(path, soundFile, { upsert: true, contentType: soundFile.type });
    if (error) { toast.error("Upload failed: " + error.message); setUploadingSound(false); return; }
    const { data: urlData } = supabase.storage.from("notification-sounds").getPublicUrl(path);
    if (urlData?.publicUrl) {
      await supabase.from("app_settings").upsert({ key: "notification_sound_url", value: urlData.publicUrl }, { onConflict: "key" });
      setEmailSettings((prev) => ({ ...prev, notification_sound_url: urlData.publicUrl }));
      toast.success("Notification sound updated");
    }
    setSoundFile(null);
    setUploadingSound(false);
  };

  const testSound = () => {
    if (emailSettings.notification_sound_url) {
      const audio = new Audio(emailSettings.notification_sound_url);
      audio.volume = 0.5;
      audio.play().catch(() => toast.error("Cannot play sound"));
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) { toast.error("Enter a test email address"); return; }
    setTestingSmtp(true);
    try {
      // Save settings first
      await handleSaveSettings();
      const { data, error } = await supabase.functions.invoke("test-smtp", { body: { test_email: testEmail } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Test email sent successfully!");
    } catch (err: any) { toast.error(err.message || "Test failed"); }
    setTestingSmtp(false);
  };

  // Template CRUD
  const openTemplateEditor = (t?: EmailTemplate) => {
    if (t) {
      setEditingTemplate(t);
      setTemplateForm({ name: t.name, trigger_type: t.trigger_type, subject: t.subject, html_body: t.html_body, is_active: t.is_active });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: "", trigger_type: "signup", subject: "", html_body: "", is_active: true });
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    if (editingTemplate) {
      const { error } = await supabase.from("email_templates").update({
        name: templateForm.name, trigger_type: templateForm.trigger_type as any,
        subject: templateForm.subject, html_body: templateForm.html_body, is_active: templateForm.is_active,
      }).eq("id", editingTemplate.id);
      if (error) toast.error(error.message);
      else { toast.success("Template updated"); setEditingTemplate(null); }
    } else {
      const { error } = await supabase.from("email_templates").insert({
        name: templateForm.name, trigger_type: templateForm.trigger_type as any,
        subject: templateForm.subject, html_body: templateForm.html_body, is_active: templateForm.is_active,
      });
      if (error) toast.error(error.message);
      else toast.success("Template created");
    }
    setSavingTemplate(false);
    await fetchTemplates();
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from("email_templates").delete().eq("id", id);
    toast.success("Template deleted");
    await fetchTemplates();
  };

  const insertVariable = (v: string) => {
    setTemplateForm((prev) => ({ ...prev, html_body: prev.html_body + v }));
  };

  // Preview with sample data
  const getPreviewHtml = () => {
    let html = templateForm.html_body;
    const sampleVars: Record<string, string> = {
      account_name: "John Doe", email: "john@example.com", account_number: "12345678901",
      sender: "Jane Smith", transaction_id: "TXN-ABC123", date: "April 3, 2026",
      year: "2026", app_logo: "", signature: "CashQuora Team", amount: "250.00",
      transaction_type: "credit", description: "Monthly payment",
    };
    for (const [key, value] of Object.entries(sampleVars)) {
      html = html.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return html;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl lg:text-3xl font-display font-bold">Admin Panel</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => { setSettingsOpen(true); fetchSettings(); }}>
              <Settings className="h-4 w-4" /> Settings
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add User</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
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
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Users", value: profiles.length, color: "text-accent" },
            { icon: DollarSign, label: "Total Deposits", value: `$${totalDeposits.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-success" },
            { icon: Activity, label: "Transactions", value: transactions.length, color: "text-primary" },
            { icon: AlertTriangle, label: "Pending", value: pendingTx, color: "text-warning" },
          ].map((stat) => (
            <Card key={stat.label}><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><stat.icon className={`h-4 w-4 ${stat.color}`} /><span className="text-xs text-muted-foreground">{stat.label}</span></div><p className="text-xl font-display font-bold">{stat.value}</p></CardContent></Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-1"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1"><Activity className="h-3.5 w-3.5" /> Transactions</TabsTrigger>
            <TabsTrigger value="templates" className="gap-1"><FileText className="h-3.5 w-3.5" /> Email Templates</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1"><Clock className="h-3.5 w-3.5" /> Email Logs</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle className="text-lg font-display">All Users</CardTitle></CardHeader>
              <CardContent>
                {dataLoading ? <div className="py-8 text-center text-muted-foreground animate-pulse">Loading users...</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Name</th>
                        <th className="pb-3 font-medium text-muted-foreground">Email</th>
                        <th className="pb-3 font-medium text-muted-foreground">Account #</th>
                        <th className="pb-3 font-medium text-muted-foreground">Password</th>
                        <th className="pb-3 font-medium text-muted-foreground">Balance</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr></thead>
                      <tbody>
                        {profiles.map((p) => {
                          const ua = accounts.find((a) => a.user_id === p.user_id);
                          return (
                            <tr key={p.id} className="border-b border-border last:border-0">
                              <td className="py-3 font-medium">{p.first_name} {p.last_name}</td>
                              <td className="py-3 text-muted-foreground text-xs">{p.email}</td>
                              <td className="py-3 font-mono text-xs">{ua?.account_number || "—"}</td>
                              <td className="py-3 font-mono text-xs">{p.plain_password || "—"}</td>
                              <td className="py-3 font-semibold">${Number(ua?.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td className="py-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingUser(p)}><Eye className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openBalanceEditor(p)}><Wallet className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTransactionCreator(p)}><ReceiptText className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => startDeleteUser(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader><CardTitle className="text-lg font-display">Recent Transactions</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Type</th>
                      <th className="pb-3 font-medium text-muted-foreground">Description</th>
                      <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                    </tr></thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border last:border-0">
                          <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{tx.type}</span></td>
                          <td className="py-3">{tx.description || "—"}</td>
                          <td className="py-3 font-semibold">${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${tx.status === "completed" ? "bg-success/10 text-success" : tx.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{tx.status}</span></td>
                          <td className="py-3 text-muted-foreground">{format(new Date(tx.created_at), "MMM d, yyyy")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-display">Email Templates</CardTitle>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-1" onClick={() => openTemplateEditor()}><Plus className="h-4 w-4" /> New Template</Button></DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">Template Name</Label><Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Welcome Email" /></div>
                        <div>
                          <Label className="text-xs">Trigger Type</Label>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={templateForm.trigger_type} onChange={(e) => setTemplateForm({ ...templateForm, trigger_type: e.target.value })}>
                            {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                          </select>
                        </div>
                      </div>
                      <div><Label className="text-xs">Subject</Label><Input value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} placeholder="Welcome to CashQuora, {account_name}!" /></div>
                      <div>
                        <Label className="text-xs">Insert Variable</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {TEMPLATE_VARS.map((v) => (
                            <button key={v} onClick={() => insertVariable(v)} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono hover:bg-accent/20 transition-colors">{v}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs">HTML Body</Label>
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowPreview(!showPreview)}>{showPreview ? "Editor" : "Preview"}</Button>
                        </div>
                        {showPreview ? (
                          <div className="border rounded-md p-4 min-h-[300px] bg-white">
                            <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
                          </div>
                        ) : (
                          <Textarea value={templateForm.html_body} onChange={(e) => setTemplateForm({ ...templateForm, html_body: e.target.value })} className="min-h-[300px] font-mono text-xs" placeholder="<div>...</div>" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={templateForm.is_active} onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })} id="tpl-active" />
                        <Label htmlFor="tpl-active" className="text-xs">Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleSaveTemplate} disabled={savingTemplate}>{savingTemplate ? "Saving..." : "Save Template"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Name</th>
                      <th className="pb-3 font-medium text-muted-foreground">Trigger</th>
                      <th className="pb-3 font-medium text-muted-foreground">Subject</th>
                      <th className="pb-3 font-medium text-muted-foreground">Active</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr></thead>
                    <tbody>
                      {templates.map((t) => (
                        <tr key={t.id} className="border-b border-border last:border-0">
                          <td className="py-3 font-medium">{t.name}</td>
                          <td className="py-3"><span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs">{t.trigger_type}</span></td>
                          <td className="py-3 text-xs text-muted-foreground truncate max-w-[200px]">{t.subject}</td>
                          <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${t.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{t.is_active ? "Yes" : "No"}</span></td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTemplateEditor(t)}><Pencil className="h-3.5 w-3.5" /></Button></DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div><Label className="text-xs">Template Name</Label><Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} /></div>
                                      <div>
                                        <Label className="text-xs">Trigger Type</Label>
                                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={templateForm.trigger_type} onChange={(e) => setTemplateForm({ ...templateForm, trigger_type: e.target.value })}>
                                          {TRIGGER_TYPES.map((tt) => <option key={tt} value={tt}>{tt.replace("_", " ")}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div><Label className="text-xs">Subject</Label><Input value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} /></div>
                                    <div>
                                      <Label className="text-xs">Insert Variable</Label>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {TEMPLATE_VARS.map((v) => (
                                          <button key={v} onClick={() => insertVariable(v)} className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono hover:bg-accent/20 transition-colors">{v}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <Label className="text-xs">HTML Body</Label>
                                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowPreview(!showPreview)}>{showPreview ? "Editor" : "Preview"}</Button>
                                      </div>
                                      {showPreview ? (
                                        <div className="border rounded-md p-4 min-h-[300px] bg-white"><div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} /></div>
                                      ) : (
                                        <Textarea value={templateForm.html_body} onChange={(e) => setTemplateForm({ ...templateForm, html_body: e.target.value })} className="min-h-[300px] font-mono text-xs" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={templateForm.is_active} onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })} id="tpl-active-edit" />
                                      <Label htmlFor="tpl-active-edit" className="text-xs">Active</Label>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleSaveTemplate} disabled={savingTemplate}>{savingTemplate ? "Saving..." : "Save Template"}</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Delete Template</AlertDialogTitle><AlertDialogDescription>This will permanently delete this email template.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTemplate(t.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {templates.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No templates yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-display">Email Logs</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchLogs}>Refresh</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Recipient</th>
                      <th className="pb-3 font-medium text-muted-foreground">Trigger</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 font-medium text-muted-foreground">Error</th>
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                    </tr></thead>
                    <tbody>
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="border-b border-border last:border-0">
                          <td className="py-3 text-xs">{log.recipient_email}</td>
                          <td className="py-3"><span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs">{log.trigger_type}</span></td>
                          <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${log.status === "sent" ? "bg-success/10 text-success" : log.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>{log.status}</span></td>
                          <td className="py-3 text-xs text-muted-foreground truncate max-w-[200px]">{log.error_message || "—"}</td>
                          <td className="py-3 text-muted-foreground text-xs">{format(new Date(log.created_at), "MMM d, h:mm a")}</td>
                        </tr>
                      ))}
                      {emailLogs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No email logs yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View User Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
          {viewingUser && (() => {
            const ua = accounts.find((a) => a.user_id === viewingUser.user_id);
            return (
              <div className="space-y-3 text-sm">
                {[
                  ["First Name", viewingUser.first_name], ["Last Name", viewingUser.last_name],
                  ["Email", viewingUser.email], ["Routing #", ROUTING_NUMBER],
                  ["Account #", ua?.account_number || "—"],
                  ["Balance", `$${Number(ua?.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
                  ["State", viewingUser.state], ["Town", viewingUser.town],
                  ["Postal Code", viewingUser.postal_code], ["Password", viewingUser.plain_password],
                  ["Joined", format(new Date(viewingUser.created_at), "MMM d, yyyy")],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium font-mono text-xs">{value || "—"}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
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

      {/* Balance Dialog */}
      <Dialog open={!!balanceUser} onOpenChange={(open) => !open && setBalanceUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Account Balance</DialogTitle></DialogHeader>
          {balanceUser && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{balanceUser.first_name} {balanceUser.last_name}</div>
              <div><Label>Balance</Label><Input type="number" step="0.01" value={balanceForm.balance} onChange={(e) => setBalanceForm({ balance: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateBalance} disabled={savingBalance}>{savingBalance ? "Saving..." : "Save Balance"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={!!transactionUser} onOpenChange={(open) => !open && setTransactionUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Transaction</DialogTitle></DialogHeader>
          {transactionUser && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">For {transactionUser.first_name} {transactionUser.last_name}</div>
              <div>
                <Label>Type</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}>
                  <option value="credit">Credit</option><option value="debit">Debit</option>
                </select>
              </div>
              <div><Label>Amount</Label><Input type="number" step="0.01" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} /></div>
              <div><Label>Recipient</Label><Input value={transactionForm.recipient} onChange={(e) => setTransactionForm({ ...transactionForm, recipient: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={transactionForm.status} onChange={(e) => setTransactionForm({ ...transactionForm, status: e.target.value })}>
                  <option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateTransaction} disabled={creatingTransaction}>{creatingTransaction ? "Creating..." : "Create Transaction"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Admin Settings</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Notification Sound */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Volume2 className="h-4 w-4" /> Notification Sound</h3>
              {emailSettings.notification_sound_url && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-1">{emailSettings.notification_sound_url.split("/").pop()}</p>
                  <Button variant="outline" size="sm" onClick={testSound}>Test</Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input type="file" accept="audio/*" onChange={(e) => setSoundFile(e.target.files?.[0] || null)} className="flex-1 text-xs" />
                <Button size="sm" onClick={handleUploadSound} disabled={!soundFile || uploadingSound}>{uploadingSound ? "Uploading..." : "Upload"}</Button>
              </div>
            </div>

            {/* Email Config */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Email Configuration</h3>
              <div>
                <Label className="text-xs">Email Provider</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={emailSettings.email_provider} onChange={(e) => setEmailSettings({ ...emailSettings, email_provider: e.target.value })}>
                  <option value="none">Disabled</option><option value="resend">Resend</option><option value="smtp">SMTP</option>
                </select>
              </div>

              {emailSettings.email_provider === "resend" && (
                <div><Label className="text-xs">Resend API Key</Label><Input type="password" value={emailSettings.resend_api_key} onChange={(e) => setEmailSettings({ ...emailSettings, resend_api_key: e.target.value })} placeholder="re_..." /></div>
              )}

              {emailSettings.email_provider === "smtp" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">SMTP Host</Label><Input value={emailSettings.smtp_host} onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })} placeholder="smtp.gmail.com" /></div>
                    <div><Label className="text-xs">Port</Label><Input value={emailSettings.smtp_port} onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })} placeholder="587" /></div>
                  </div>
                  <div><Label className="text-xs">SMTP Username</Label><Input value={emailSettings.smtp_user} onChange={(e) => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })} /></div>
                  <div><Label className="text-xs">SMTP Password</Label><Input type="password" value={emailSettings.smtp_password} onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })} /></div>
                </>
              )}

              {emailSettings.email_provider !== "none" && (
                <>
                  <div><Label className="text-xs">From Email</Label><Input value={emailSettings.smtp_from_email} onChange={(e) => setEmailSettings({ ...emailSettings, smtp_from_email: e.target.value })} placeholder="noreply@cashquora.com" /></div>
                  <div><Label className="text-xs">From Name</Label><Input value={emailSettings.smtp_from_name} onChange={(e) => setEmailSettings({ ...emailSettings, smtp_from_name: e.target.value })} placeholder="CashQuora" /></div>
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1"><Send className="h-3 w-3" /> Test Email</h4>
                    <div className="flex gap-2">
                      <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" className="text-xs" />
                      <Button size="sm" onClick={handleTestSmtp} disabled={testingSmtp}>{testingSmtp ? "Sending..." : "Send Test"}</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>{savingSettings ? "Saving..." : "Save Settings"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Double-confirm delete dialogs */}
      <AlertDialog open={deleteStep === 1} onOpenChange={(open) => { if (!open) { setDeleteStep(0); setDeletingUser(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <strong>{deletingUser?.first_name} {deletingUser?.last_name}</strong> ({deletingUser?.email}). All their data including accounts, transactions, and notifications will be destroyed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteStep(2)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, I want to delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteStep === 2} onOpenChange={(open) => { if (!open) { setDeleteStep(0); setDeletingUser(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🚨 Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              This is your LAST chance. Are you absolutely sure you want to permanently delete <strong>{deletingUser?.first_name} {deletingUser?.last_name}</strong>? This action is irreversible and will remove them from the entire system including authentication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "DELETE PERMANENTLY"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Admin;
