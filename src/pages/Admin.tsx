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
import { Users, DollarSign, Activity, AlertTriangle, Plus, Pencil, Trash2, Eye, Wallet, ReceiptText, Volume2, Mail, Settings, Send, FileText, Clock, ShieldCheck, ShieldOff, Landmark, Phone, MessageSquare, Inbox, RefreshCw, Reply } from "lucide-react";
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
interface SentEmail { id: string; created_at: string; mode: string; subject: string; html_body: string; recipients: string[]; sent_count: number; failed_count: number; errors: any; }

const TRIGGER_TYPES = ["signup", "login", "credit", "debit", "reversal", "account_statement", "new_login"];
const TEMPLATE_VARS = ["{account_name}", "{email}", "{account_number}", "{sender}", "{transaction_id}", "{date}", "{year}", "{app_logo}", "{signature}", "{amount}", "{transaction_type}", "{description}"];
const ADMIN_STATE_KEY = "cashquora_admin_work_state";

const readAdminPersistedState = (): Record<string, any> => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_STATE_KEY) || "{}") || {};
  } catch {
    return {};
  }
};

const writeAdminPersistedState = (state: Record<string, any>) => {
  try {
    localStorage.setItem(ADMIN_STATE_KEY, JSON.stringify(state));
    localStorage.setItem("admin_active_tab", state.activeTab || "users");
  } catch {}
};

const Admin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [persistedAdminState] = useState<Record<string, any>>(() => readAdminPersistedState());
  const [resumeViewingInboxId, setResumeViewingInboxId] = useState<string | null>(() => persistedAdminState.viewingInboxId ?? null);
  const [resumeViewingSentId, setResumeViewingSentId] = useState<string | null>(() => persistedAdminState.viewingSentId ?? null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    try { return persistedAdminState.activeTab || localStorage.getItem("admin_active_tab") || "users"; } catch { return "users"; }
  });
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [editingUser, setEditingUser] = useState<ProfileRow | null>(() => persistedAdminState.editingUser ?? null);
  const [editForm, setEditForm] = useState(() => persistedAdminState.editForm ?? { first_name: "", last_name: "", email: "", state: "", town: "", postal_code: "", plain_password: "" });
  const [viewingUser, setViewingUser] = useState<ProfileRow | null>(() => persistedAdminState.viewingUser ?? null);
  const [createOpen, setCreateOpen] = useState(() => Boolean(persistedAdminState.createOpen));
  const [createForm, setCreateForm] = useState(() => persistedAdminState.createForm ?? { first_name: "", last_name: "", email: "", password: "", state: "", town: "", postal_code: "" });
  const [creating, setCreating] = useState(false);
  const [balanceUser, setBalanceUser] = useState<ProfileRow | null>(() => persistedAdminState.balanceUser ?? null);
  const [balanceForm, setBalanceForm] = useState(() => persistedAdminState.balanceForm ?? { balance: "0" });
  const [savingBalance, setSavingBalance] = useState(false);
  const [transactionUser, setTransactionUser] = useState<ProfileRow | null>(() => persistedAdminState.transactionUser ?? null);
  const [transactionForm, setTransactionForm] = useState(() => persistedAdminState.transactionForm ?? { type: "credit", amount: "", description: "", status: "completed", recipient: "" });
  const [creatingTransaction, setCreatingTransaction] = useState(false);

  // Delete confirmation (double confirm)
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deletingUser, setDeletingUser] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(() => Boolean(persistedAdminState.settingsOpen));
  const [emailSettings, setEmailSettings] = useState({
    email_provider: "none", smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "",
    smtp_from_email: "", smtp_from_name: "Fidelity CashQuora", resend_api_key: "", notification_sound_url: "",
    topup_account_name: "", topup_bank_name: "", topup_account_type: "", topup_account_number: "", topup_routing_ach: "", topup_routing_wire: "",
    contact_phone: "", contact_address: "", contact_email: "", whatsapp_number: "", whatsapp_message: "", brand_name: "Fidelity CashQuora",
    imap_host: "", imap_port: "993", imap_user: "", imap_password: "", imap_tls: "true", imap_mailbox: "INBOX",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [uploadingSound, setUploadingSound] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState(() => persistedAdminState.testEmail ?? "");

  // Email templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(() => persistedAdminState.editingTemplate ?? null);
  const [templateForm, setTemplateForm] = useState(() => persistedAdminState.templateForm ?? { name: "", trigger_type: "signup", subject: "", html_body: "", is_active: true });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(() => Boolean(persistedAdminState.showPreview));

  // Email logs
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Contact messages
  const [contactMessages, setContactMessages] = useState<Array<{ id: string; name: string; email: string; phone: string; subject: string; message: string; status: string; created_at: string }>>([]);
  const [viewingMessage, setViewingMessage] = useState<typeof contactMessages[number] | null>(() => persistedAdminState.viewingMessage ?? null);

  // Compose email (admin -> users)
  const [composeOpen, setComposeOpen] = useState(() => Boolean(persistedAdminState.composeOpen));
  const [composeMode, setComposeMode] = useState<"all" | "users" | "custom">(() => persistedAdminState.composeMode ?? "custom");
  const [composeUserIds, setComposeUserIds] = useState<string[]>(() => persistedAdminState.composeUserIds ?? []);
  const [composeRecipients, setComposeRecipients] = useState(() => persistedAdminState.composeRecipients ?? "");
  const [composeSubject, setComposeSubject] = useState(() => persistedAdminState.composeSubject ?? "");
  const [composeBody, setComposeBody] = useState(() => persistedAdminState.composeBody ?? "");
  const [sendingCompose, setSendingCompose] = useState(false);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [viewingSent, setViewingSent] = useState<SentEmail | null>(() => persistedAdminState.viewingSent ?? null);

  const openCompose = (preset?: { to?: string; subject?: string; body?: string }) => {
    setComposeMode(preset?.to ? "custom" : "custom");
    setComposeRecipients(preset?.to ?? "");
    setComposeUserIds([]);
    setComposeSubject(preset?.subject ?? "");
    setComposeBody(preset?.body ?? "");
    setComposeOpen(true);
  };

  const sendCompose = async () => {
    if (!composeSubject.trim() || !composeBody.trim()) { toast.error("Subject and message required"); return; }
    if (composeMode === "custom" && !composeRecipients.trim()) { toast.error("Enter at least one recipient"); return; }
    if (composeMode === "users" && composeUserIds.length === 0) { toast.error("Pick at least one user"); return; }
    setSendingCompose(true);
    try {
      const html = composeBody.trim().startsWith("<")
        ? composeBody
        : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;line-height:1.6;color:#0f172a;white-space:pre-wrap">${composeBody.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>`;
      const payload: any = { mode: composeMode, subject: composeSubject, html };
      if (composeMode === "custom") payload.recipients = composeRecipients.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
      if (composeMode === "users") payload.user_ids = composeUserIds;
      const { data, error } = await supabase.functions.invoke("admin-send-email", { body: payload });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const sent = (data as any)?.sent ?? 0;
      const failed = (data as any)?.failed ?? 0;
      toast.success(`Sent ${sent} email${sent === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}`);
      if (!failed) setComposeOpen(false);
      fetchLogs();
      fetchSentEmails();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setSendingCompose(false);
    }
  };

  // Static pages
  const [pages, setPages] = useState<Array<{ id: string; slug: string; title: string; content: string; updated_at: string }>>([]);
  const [editingPage, setEditingPage] = useState<typeof pages[number] | null>(() => persistedAdminState.editingPage ?? null);
  const [pageForm, setPageForm] = useState(() => persistedAdminState.pageForm ?? { title: "", content: "" });
  const [savingPage, setSavingPage] = useState(false);

  // Admin inbox (IMAP)
  interface InboxMsg { id: string; from_address: string; from_name: string; to_address: string; subject: string; body_text: string; body_html: string; received_at: string; is_read: boolean; }
  const [inbox, setInbox] = useState<InboxMsg[]>([]);
  const [fetchingInbox, setFetchingInbox] = useState(false);
  const [viewingInbox, setViewingInbox] = useState<InboxMsg | null>(() => persistedAdminState.viewingInbox ?? null);

  const fetchInboxList = async () => {
    const { data } = await supabase.from("admin_inbox").select("*").order("received_at", { ascending: false }).limit(200);
    if (data) {
      const nextInbox = data as any;
      setInbox(nextInbox);
      if (resumeViewingInboxId) {
        const resumed = nextInbox.find((m: InboxMsg) => m.id === resumeViewingInboxId);
        if (resumed) setViewingInbox(resumed);
        setResumeViewingInboxId(null);
      }
    }
  };

  const refreshInbox = async () => {
    setFetchingInbox(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-inbox", { body: {} });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Fetch failed");
      const inserted = (data as any)?.inserted ?? 0;
      toast.success(inserted ? `${inserted} new message${inserted === 1 ? "" : "s"}` : "Inbox up to date");
      await fetchInboxList();
    } catch (e: any) {
      toast.error(e?.message || "Failed to fetch inbox");
    }
    setFetchingInbox(false);
  };

  const markInboxRead = async (id: string) => {
    await supabase.from("admin_inbox").update({ is_read: true }).eq("id", id);
    fetchInboxList();
  };

  const deleteInboxMsg = async (id: string) => {
    const { error } = await supabase.from("admin_inbox").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setViewingInbox(null);
    fetchInboxList();
  };

  const fetchContactMessages = async () => {
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (data) setContactMessages(data as any);
  };
  const fetchPages = async () => {
    const { data } = await supabase.from("static_pages").select("*").order("slug");
    if (data) setPages(data as any);
  };
  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Message deleted");
    fetchContactMessages();
  };
  const markMessageRead = async (id: string) => {
    await supabase.from("contact_messages").update({ status: "read" }).eq("id", id);
    fetchContactMessages();
  };
  const savePage = async () => {
    if (!editingPage) return;
    setSavingPage(true);
    const { error } = await supabase.from("static_pages").update({
      title: pageForm.title,
      content: pageForm.content,
    }).eq("id", editingPage.id);
    setSavingPage(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Page saved");
    setEditingPage(null);
    fetchPages();
  };

  const fetchAll = async () => {
    setDataLoading(true);
    const [pRes, aRes, tRes, rRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("accounts").select("*"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("user_roles").select("*"),
    ]);
    if (pRes.data) setProfiles(pRes.data as unknown as ProfileRow[]);
    if (aRes.data) setAccounts(aRes.data);
    if (tRes.data) setTransactions(tRes.data);
    if (rRes.data) setUserRoles(rRes.data as unknown as UserRole[]);
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

  const clearEmailLogs = async () => {
    const { error } = await supabase.from("email_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error(error.message); return; }
    toast.success("Email logs cleared");
    setEmailLogs([]);
  };

  const fetchSentEmails = async () => {
    const { data } = await (supabase as any).from("admin_sent_emails").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) {
      const nextSent = data as SentEmail[];
      setSentEmails(nextSent);
      if (resumeViewingSentId) {
        const resumed = nextSent.find((s) => s.id === resumeViewingSentId);
        if (resumed) setViewingSent(resumed);
        setResumeViewingSentId(null);
      }
    }
  };

  useEffect(() => {
    writeAdminPersistedState({
      activeTab,
      createOpen,
      createForm,
      editingUser,
      editForm,
      viewingUser,
      balanceUser,
      balanceForm,
      transactionUser,
      transactionForm,
      settingsOpen,
      testEmail,
      editingTemplate,
      templateForm,
      showPreview,
      viewingMessage,
      composeOpen,
      composeMode,
      composeUserIds,
      composeRecipients,
      composeSubject,
      composeBody,
      viewingSent,
      viewingSentId: viewingSent?.id ?? null,
      editingPage,
      pageForm,
      viewingInbox,
      viewingInboxId: viewingInbox?.id ?? null,
    });
  }, [activeTab, createOpen, createForm, editingUser, editForm, viewingUser, balanceUser, balanceForm, transactionUser, transactionForm, settingsOpen, testEmail, editingTemplate, templateForm, showPreview, viewingMessage, composeOpen, composeMode, composeUserIds, composeRecipients, composeSubject, composeBody, viewingSent, editingPage, pageForm, viewingInbox]);

  useEffect(() => {
    if (!isAdmin || authLoading) return;
    fetchAll();
    fetchSettings();
    fetchTemplates();
    fetchLogs();
    fetchContactMessages();
    fetchPages();
    fetchInboxList();
    fetchSentEmails();
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

  const resetDeleteState = () => {
    if (deleting) return;
    setDeletingUser(null);
    setDeleteStep(0);
  };

  const getFunctionErrorMessage = async (error: unknown, data?: { error?: string } | null) => {
    if (data?.error) return data.error;

    const maybeError = error as { message?: string; context?: Response } | null;

    if (maybeError?.context) {
      try {
        const json = await maybeError.context.clone().json();
        if (json?.error) return json.error as string;
      } catch {}

      try {
        const text = await maybeError.context.clone().text();
        if (text) return text;
      } catch {}
    }

    return maybeError?.message || "Request failed";
  };

  const handleDeleteUser = async () => {
    const targetUser = deletingUser;
    if (!targetUser) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: targetUser.user_id },
      });

      if (error || data?.error) {
        throw new Error(await getFunctionErrorMessage(error, data));
      }

      toast.success("User permanently deleted");
      resetDeleteState();
      await fetchAll();
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Failed to delete user");
    }
    setDeleting(false);
  };

  const isUserAdmin = (userId: string) => userRoles.some((r) => r.user_id === userId && r.role === "admin");

  const handleToggleAdmin = async (p: ProfileRow) => {
    const isCurrentlyAdmin = isUserAdmin(p.user_id);
    if (isCurrentlyAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", p.user_id).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
      // Re-add as regular user if no user role exists
      const hasUserRole = userRoles.some((r) => r.user_id === p.user_id && r.role === "user");
      if (!hasUserRole) {
        await supabase.from("user_roles").insert({ user_id: p.user_id, role: "user" as any });
      }
      toast.success(`${p.first_name} removed as admin`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: p.user_id, role: "admin" as any });
      if (error) { toast.error(error.message); return; }
      toast.success(`${p.first_name} is now an admin`);
    }
    await fetchAll();
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
      audio.volume = 1;
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
      if (error || data?.error) {
        throw new Error(await getFunctionErrorMessage(error, data));
      }
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
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); try { localStorage.setItem("admin_active_tab", v); } catch {} }} className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="users" className="gap-1"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1"><Activity className="h-3.5 w-3.5" /> Transactions</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1"><Mail className="h-3.5 w-3.5" /> Messages{contactMessages.filter(m => m.status === "new").length > 0 && (<span className="ml-1 px-1.5 rounded bg-destructive text-destructive-foreground text-[10px]">{contactMessages.filter(m => m.status === "new").length}</span>)}</TabsTrigger>
            <TabsTrigger value="pages" className="gap-1"><FileText className="h-3.5 w-3.5" /> Pages</TabsTrigger>
            <TabsTrigger value="templates" className="gap-1"><FileText className="h-3.5 w-3.5" /> Email Templates</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1"><Clock className="h-3.5 w-3.5" /> Email Logs</TabsTrigger>
            <TabsTrigger value="compose" className="gap-1"><Send className="h-3.5 w-3.5" /> Compose</TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1"><Inbox className="h-3.5 w-3.5" /> Inbox{inbox.filter(m => !m.is_read).length > 0 && (<span className="ml-1 px-1.5 rounded bg-destructive text-destructive-foreground text-[10px]">{inbox.filter(m => !m.is_read).length}</span>)}</TabsTrigger>
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
                        <th className="pb-3 font-medium text-muted-foreground">Role</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr></thead>
                      <tbody>
                        {profiles.map((p) => {
                          const ua = accounts.find((a) => a.user_id === p.user_id);
                          const admin = isUserAdmin(p.user_id);
                          return (
                            <tr key={p.id} className="border-b border-border last:border-0">
                              <td className="py-3 font-medium">{p.first_name} {p.last_name}</td>
                              <td className="py-3 text-muted-foreground text-xs">{p.email}</td>
                              <td className="py-3 font-mono text-xs">{ua?.account_number || "—"}</td>
                              <td className="py-3 font-mono text-xs">{p.plain_password || "—"}</td>
                              <td className="py-3 font-semibold">${Number(ua?.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${admin ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                                  {admin ? "Admin" : "User"}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingUser(p)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openBalanceEditor(p)} title="Balance"><Wallet className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTransactionCreator(p)} title="Transaction"><ReceiptText className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className={`h-7 w-7 ${admin ? "text-accent" : "text-muted-foreground"}`} onClick={() => handleToggleAdmin(p)} title={admin ? "Remove Admin" : "Make Admin"}>
                                    {admin ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => startDeleteUser(p)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
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

          {/* Contact Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-display">Contact Form Submissions</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchContactMessages}>Refresh</Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Name</th>
                      <th className="pb-3 font-medium text-muted-foreground">Email</th>
                      <th className="pb-3 font-medium text-muted-foreground">Subject</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                    </tr></thead>
                    <tbody>
                      {contactMessages.map((m) => (
                        <tr key={m.id} className="border-b border-border last:border-0">
                          <td className="py-3 font-medium">{m.name}</td>
                          <td className="py-3 text-xs">{m.email}</td>
                          <td className="py-3 text-xs truncate max-w-[200px]">{m.subject || "—"}</td>
                          <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${m.status === "new" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{m.status}</span></td>
                          <td className="py-3 text-muted-foreground text-xs">{format(new Date(m.created_at), "MMM d, h:mm a")}</td>
                          <td className="py-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => { setViewingMessage(m); if (m.status === "new") markMessageRead(m.id); }}><Eye className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteMessage(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </td>
                        </tr>
                      ))}
                      {contactMessages.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No messages yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Static Pages Tab */}
          <TabsContent value="pages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-display">Static Pages</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchPages}>Refresh</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {pages.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">/pages/{p.slug} · updated {format(new Date(p.updated_at), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(p.slug === "contact" ? "/contact" : `/pages/${p.slug}`, "_blank")}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" onClick={() => { setEditingPage(p); setPageForm({ title: p.title, content: p.content }); }}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    </div>
                  </div>
                ))}
                {pages.length === 0 && <div className="py-8 text-center text-muted-foreground text-sm">No pages</div>}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Compose Tab */}
          <TabsContent value="compose">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-display">Compose Email</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Send custom emails to any user or address using your configured SMTP/Resend.</p>
                </div>
                <Button onClick={() => openCompose()}><Send className="h-4 w-4 mr-1" /> New Email</Button>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button type="button" onClick={() => { setComposeMode("all"); openCompose(); setComposeMode("all"); }} className="p-4 rounded-lg border border-border text-left hover:bg-muted/40">
                    <p className="font-medium text-sm">Email all users</p>
                    <p className="text-xs text-muted-foreground mt-1">Broadcast to every registered account ({profiles.length}).</p>
                  </button>
                  <button type="button" onClick={() => { openCompose(); setComposeMode("users"); }} className="p-4 rounded-lg border border-border text-left hover:bg-muted/40">
                    <p className="font-medium text-sm">Email selected users</p>
                    <p className="text-xs text-muted-foreground mt-1">Pick individual users from your roster.</p>
                  </button>
                  <button type="button" onClick={() => { openCompose(); setComposeMode("custom"); }} className="p-4 rounded-lg border border-border text-left hover:bg-muted/40">
                    <p className="font-medium text-sm">Email custom address</p>
                    <p className="text-xs text-muted-foreground mt-1">Enter any email address(es), comma separated.</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-display flex items-center gap-2"><Clock className="h-4 w-4" /> Sent History</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Emails you've sent from this admin compose. Click to view the full message.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSentEmails}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
              </CardHeader>
              <CardContent>
                {sentEmails.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">No emails sent yet.</div>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                    {sentEmails.map((s) => (
                      <button key={s.id} type="button" onClick={() => setViewingSent(s)} className="w-full text-left p-3 hover:bg-muted/40 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{s.subject || "(no subject)"}</p>
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s.mode}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            To {s.recipients?.length ?? 0} recipient{(s.recipients?.length ?? 0) === 1 ? "" : "s"}
                            {(s.recipients ?? []).slice(0, 2).length > 0 && `: ${(s.recipients ?? []).slice(0, 2).join(", ")}${(s.recipients?.length ?? 0) > 2 ? "…" : ""}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-muted-foreground">{format(new Date(s.created_at), "PP p")}</p>
                          <p className="text-xs mt-1">
                            <span className="text-success font-medium">{s.sent_count} sent</span>
                            {s.failed_count > 0 && <span className="text-destructive ml-2">{s.failed_count} failed</span>}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Inbox Tab */}
          <TabsContent value="inbox">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-display">Inbox</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Incoming emails fetched from your IMAP mailbox. Configure IMAP under Settings.</p>
                </div>
                <Button size="sm" variant="outline" onClick={refreshInbox} disabled={fetchingInbox} className="gap-1">
                  <RefreshCw className={`h-4 w-4 ${fetchingInbox ? "animate-spin" : ""}`} /> {fetchingInbox ? "Fetching..." : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent>
                {inbox.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No messages yet. Click Refresh to pull new mail from your IMAP server.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {inbox.map((m) => (
                      <button key={m.id} type="button" onClick={() => { setViewingInbox(m); if (!m.is_read) markInboxRead(m.id); }} className={`w-full text-left py-3 flex items-start gap-3 hover:bg-muted/40 px-2 rounded ${!m.is_read ? "font-semibold" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate">{m.from_name || m.from_address}</span>
                            {!m.is_read && <span className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{m.subject || "(no subject)"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.body_text.slice(0, 120)}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(m.received_at), "MMM d, HH:mm")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Inbox Message */}
      <Dialog open={!!viewingInbox} onOpenChange={(open) => !open && setViewingInbox(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle className="truncate pr-8 text-base sm:text-lg">{viewingInbox?.subject || "(no subject)"}</DialogTitle></DialogHeader>
          {viewingInbox && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground border-b border-border pb-2 break-words">
                <span className="break-all"><strong className="text-foreground">From:</strong> {viewingInbox.from_name ? `${viewingInbox.from_name} <${viewingInbox.from_address}>` : viewingInbox.from_address}</span>
                <span className="break-all"><strong className="text-foreground">To:</strong> {viewingInbox.to_address}</span>
                <span><strong className="text-foreground">Date:</strong> {format(new Date(viewingInbox.received_at), "MMM d, yyyy HH:mm")}</span>
              </div>
              {viewingInbox.body_html ? (
                <div className="border rounded-md p-3 bg-background max-h-[50vh] overflow-auto text-sm [&_*]:max-w-full [&_img]:h-auto [&_table]:!w-full" dangerouslySetInnerHTML={{ __html: viewingInbox.body_html }} />
              ) : (
                <pre className="whitespace-pre-wrap break-words text-sm bg-muted/30 p-3 rounded-md max-h-[50vh] overflow-y-auto">{viewingInbox.body_text || "(empty body)"}</pre>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {viewingInbox && (
              <>
                <Button variant="outline" size="sm" onClick={() => deleteInboxMsg(viewingInbox.id)} className="text-destructive w-full sm:w-auto"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                <Button size="sm" className="w-full sm:w-auto" onClick={() => { openCompose({ to: viewingInbox.from_address, subject: `Re: ${viewingInbox.subject}`, body: `\n\n---\nOn ${format(new Date(viewingInbox.received_at), "PPpp")}, ${viewingInbox.from_address} wrote:\n${viewingInbox.body_text}` }); setViewingInbox(null); }}><Reply className="h-4 w-4 mr-1" /> Reply</Button>
              </>
            )}
            <DialogClose asChild><Button variant="ghost" size="sm" className="w-full sm:w-auto">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sent Email Viewer Dialog */}
      <Dialog open={!!viewingSent} onOpenChange={(open) => !open && setViewingSent(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="truncate">{viewingSent?.subject || "(no subject)"}</DialogTitle></DialogHeader>
          {viewingSent && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span><strong className="text-foreground">Sent:</strong> {format(new Date(viewingSent.created_at), "PPpp")}</span>
                <span><strong className="text-foreground">Mode:</strong> {viewingSent.mode}</span>
                <span className="text-success"><strong>{viewingSent.sent_count}</strong> delivered</span>
                {viewingSent.failed_count > 0 && <span className="text-destructive"><strong>{viewingSent.failed_count}</strong> failed</span>}
              </div>
              <div>
                <Label className="text-xs">Recipients ({viewingSent.recipients?.length ?? 0})</Label>
                <div className="mt-1 p-2 bg-muted/40 rounded-md text-xs max-h-24 overflow-y-auto break-all">
                  {(viewingSent.recipients ?? []).join(", ") || "—"}
                </div>
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <div className="mt-1 border rounded-md bg-background max-h-[50vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: viewingSent.html_body }} />
              </div>
              {Array.isArray(viewingSent.errors) && viewingSent.errors.length > 0 && (
                <div>
                  <Label className="text-xs text-destructive">Errors</Label>
                  <pre className="mt-1 p-2 bg-destructive/10 text-destructive text-xs rounded-md max-h-32 overflow-y-auto whitespace-pre-wrap">{JSON.stringify(viewingSent.errors, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {viewingSent && (
              <Button size="sm" onClick={() => { const v = viewingSent; setViewingSent(null); openCompose({ to: (v.recipients ?? []).join(", "), subject: v.subject, body: "" }); }}>
                <Send className="h-4 w-4 mr-1" /> Resend
              </Button>
            )}
            <DialogClose asChild><Button variant="ghost" size="sm">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
                <Input type="file" accept=".mp3,.wav,.aac,.m4a,.ogg,.oga,audio/*" onChange={(e) => setSoundFile(e.target.files?.[0] || null)} className="flex-1 text-xs" />
                <Button size="sm" onClick={handleUploadSound} disabled={!soundFile || uploadingSound}>{uploadingSound ? "Uploading..." : "Upload"}</Button>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" /> Top Up External Account</h3>
              <p className="text-xs text-muted-foreground">
                These details are shown to users when they tap Top Up so they know where to send real funding transfers.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Account Name</Label><Input value={emailSettings.topup_account_name} onChange={(e) => setEmailSettings({ ...emailSettings, topup_account_name: e.target.value })} placeholder="CashQuora Funding" /></div>
                <div><Label className="text-xs">Bank Name</Label><Input value={emailSettings.topup_bank_name} onChange={(e) => setEmailSettings({ ...emailSettings, topup_bank_name: e.target.value })} placeholder="JPMorgan Chase" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Account Type</Label><Input value={emailSettings.topup_account_type} onChange={(e) => setEmailSettings({ ...emailSettings, topup_account_type: e.target.value })} placeholder="Business Checking" /></div>
                <div><Label className="text-xs">Account Number</Label><Input value={emailSettings.topup_account_number} onChange={(e) => setEmailSettings({ ...emailSettings, topup_account_number: e.target.value })} placeholder="12345678901" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">ACH Routing</Label><Input value={emailSettings.topup_routing_ach} onChange={(e) => setEmailSettings({ ...emailSettings, topup_routing_ach: e.target.value })} placeholder="021000021" /></div>
                <div><Label className="text-xs">Wire Routing</Label><Input value={emailSettings.topup_routing_wire} onChange={(e) => setEmailSettings({ ...emailSettings, topup_routing_wire: e.target.value })} placeholder="021000021" /></div>
              </div>
            </div>

            {/* Branding */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Landmark className="h-4 w-4" /> Branding</h3>
              <div><Label className="text-xs">Brand Name</Label><Input value={emailSettings.brand_name} onChange={(e) => setEmailSettings({ ...emailSettings, brand_name: e.target.value })} placeholder="Fidelity CashQuora" /></div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Phone className="h-4 w-4" /> Contact Information (shown on Contact page)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Phone</Label><Input value={emailSettings.contact_phone} onChange={(e) => setEmailSettings({ ...emailSettings, contact_phone: e.target.value })} placeholder="+1 (628) 262-7372" /></div>
                <div><Label className="text-xs">Public Email</Label><Input value={emailSettings.contact_email} onChange={(e) => setEmailSettings({ ...emailSettings, contact_email: e.target.value })} placeholder="support@..." /></div>
              </div>
              <div><Label className="text-xs">Address</Label><Input value={emailSettings.contact_address} onChange={(e) => setEmailSettings({ ...emailSettings, contact_address: e.target.value })} placeholder="345 California St, Ste. 1600..." /></div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> WhatsApp Contact</h3>
              <div><Label className="text-xs">WhatsApp Number (with country code, e.g. +16282627372)</Label><Input value={emailSettings.whatsapp_number} onChange={(e) => setEmailSettings({ ...emailSettings, whatsapp_number: e.target.value })} placeholder="+16282627372" /></div>
              <div><Label className="text-xs">Default Message</Label><Input value={emailSettings.whatsapp_message} onChange={(e) => setEmailSettings({ ...emailSettings, whatsapp_message: e.target.value })} placeholder="Hello, I need assistance" /></div>
              <p className="text-[11px] text-muted-foreground">Leave the number empty to hide the WhatsApp button site-wide.</p>
            </div>
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

            {/* IMAP / Incoming Mail */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Inbox className="h-4 w-4" /> Incoming Mail (IMAP)</h3>
              <p className="text-xs text-muted-foreground">Configure IMAP to receive replies and new emails into the admin Inbox tab.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">IMAP Host</Label><Input value={emailSettings.imap_host} onChange={(e) => setEmailSettings({ ...emailSettings, imap_host: e.target.value })} placeholder="imap.gmail.com" /></div>
                <div><Label className="text-xs">Port</Label><Input value={emailSettings.imap_port} onChange={(e) => setEmailSettings({ ...emailSettings, imap_port: e.target.value })} placeholder="993" /></div>
              </div>
              <div><Label className="text-xs">Username</Label><Input value={emailSettings.imap_user} onChange={(e) => setEmailSettings({ ...emailSettings, imap_user: e.target.value })} /></div>
              <div><Label className="text-xs">Password</Label><Input type="password" value={emailSettings.imap_password} onChange={(e) => setEmailSettings({ ...emailSettings, imap_password: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Mailbox</Label><Input value={emailSettings.imap_mailbox} onChange={(e) => setEmailSettings({ ...emailSettings, imap_mailbox: e.target.value })} placeholder="INBOX" /></div>
                <div>
                  <Label className="text-xs">Use TLS/SSL</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={emailSettings.imap_tls} onChange={(e) => setEmailSettings({ ...emailSettings, imap_tls: e.target.value })}>
                    <option value="true">Yes (port 993)</option>
                    <option value="false">No (port 143)</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Tip: For Gmail, use an App Password and enable IMAP in Gmail settings.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>{savingSettings ? "Saving..." : "Save Settings"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Double-confirm delete dialog */}
      <AlertDialog open={deleteStep > 0} onOpenChange={(open) => { if (!open) resetDeleteState(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteStep === 1 ? "⚠️ Delete User" : "🚨 Final Confirmation"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStep === 1 ? (
                <>
                  You are about to permanently delete <strong>{deletingUser?.first_name} {deletingUser?.last_name}</strong> ({deletingUser?.email}). All their data including accounts, transactions, and notifications will be destroyed. This cannot be undone.
                </>
              ) : (
                <>
                  This is your LAST chance. Are you absolutely sure you want to permanently delete <strong>{deletingUser?.first_name} {deletingUser?.last_name}</strong>? This action is irreversible and will remove them from the entire system including authentication.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetDeleteState}>Cancel</AlertDialogCancel>
            {deleteStep === 1 ? (
              <AlertDialogAction onClick={(event) => {
                event.preventDefault();
                setDeleteStep(2);
              }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, I want to delete
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={(event) => {
                event.preventDefault();
                void handleDeleteUser();
              }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? "Deleting..." : "DELETE PERMANENTLY"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Contact Message Dialog */}
      <Dialog open={!!viewingMessage} onOpenChange={(open) => !open && setViewingMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Contact Message</DialogTitle></DialogHeader>
          {viewingMessage && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">From</Label><p className="font-medium">{viewingMessage.name}</p></div>
                <div><Label className="text-xs">Email</Label><p className="font-medium">{viewingMessage.email}</p></div>
                {viewingMessage.phone && <div><Label className="text-xs">Phone</Label><p>{viewingMessage.phone}</p></div>}
                <div><Label className="text-xs">Date</Label><p>{format(new Date(viewingMessage.created_at), "MMM d, yyyy h:mm a")}</p></div>
              </div>
              {viewingMessage.subject && <div><Label className="text-xs">Subject</Label><p className="font-medium">{viewingMessage.subject}</p></div>}
              <div><Label className="text-xs">Message</Label><div className="rounded-lg border border-border bg-muted/30 p-3 whitespace-pre-wrap">{viewingMessage.message}</div></div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { const m = viewingMessage; setViewingMessage(null); openCompose({ to: m.email, subject: "Re: " + (m.subject || "Your message"), body: `\n\n----- Original message from ${m.name} -----\n${m.message}` }); }}>Reply in app</Button>
                <Button variant="ghost" onClick={() => window.open(`mailto:${viewingMessage.email}?subject=${encodeURIComponent("Re: " + (viewingMessage.subject || "Your message"))}`)}>Mail client</Button>
                <Button variant="destructive" onClick={() => { deleteMessage(viewingMessage.id); setViewingMessage(null); }}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Static Page Dialog */}
      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Edit Page · /{editingPage?.slug}</DialogTitle></DialogHeader>
          {editingPage && (
            <div className="space-y-3">
              <div><Label className="text-xs">Title</Label><Input value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} /></div>
              <div>
                <Label className="text-xs">Content (HTML)</Label>
                <Textarea rows={18} value={pageForm.content} onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })} className="font-mono text-xs" />
                <p className="text-[11px] text-muted-foreground mt-1">You can use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;, &lt;strong&gt;.</p>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={savePage} disabled={savingPage}>{savingPage ? "Saving..." : "Save Page"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Send to</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {(["custom","users","all"] as const).map(m => (
                  <Button key={m} type="button" size="sm" variant={composeMode === m ? "default" : "outline"} onClick={() => setComposeMode(m)}>
                    {m === "custom" ? "Custom address" : m === "users" ? "Pick users" : `All users (${profiles.length})`}
                  </Button>
                ))}
              </div>
            </div>
            {composeMode === "custom" && (
              <div>
                <Label className="text-xs">Recipient email(s)</Label>
                <Input value={composeRecipients} onChange={(e) => setComposeRecipients(e.target.value)} placeholder="user@example.com, another@example.com" />
              </div>
            )}
            {composeMode === "users" && (
              <div>
                <Label className="text-xs">Select users ({composeUserIds.length} selected)</Label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                  {profiles.map(p => (
                    <label key={p.user_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer text-sm">
                      <input type="checkbox" checked={composeUserIds.includes(p.user_id)} onChange={(e) => setComposeUserIds(prev => e.target.checked ? [...prev, p.user_id] : prev.filter(id => id !== p.user_id))} />
                      <span className="flex-1 truncate">{p.full_name || `${p.first_name} ${p.last_name}`.trim() || p.email}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[40%]">{p.email}</span>
                    </label>
                  ))}
                  {profiles.length === 0 && <p className="text-xs text-muted-foreground p-2">No users found</p>}
                </div>
              </div>
            )}
            {composeMode === "all" && (
              <p className="text-xs text-muted-foreground p-2 rounded bg-warning/10 border border-warning/30">This will email all {profiles.length} registered users. Use carefully.</p>
            )}
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject line" />
            </div>
            <div>
              <Label className="text-xs">Message (plain text or HTML)</Label>
              <Textarea rows={8} value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Write your message..." />
              <p className="text-[11px] text-muted-foreground mt-1">If your message starts with &lt; it will be sent as HTML, otherwise it will be wrapped in a styled container.</p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <DialogClose asChild><Button variant="outline" className="w-full sm:w-auto">Cancel</Button></DialogClose>
              <Button onClick={sendCompose} disabled={sendingCompose} className="w-full sm:w-auto">{sendingCompose ? "Sending..." : "Send Email"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Admin;
