import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, DollarSign, User, FileText, CheckCircle2, Search, Loader2 } from "lucide-react";
import { ROUTING_NUMBER } from "@/lib/constants";

const SendMoney = () => {
  const { user } = useAuth();
  const [recipientAccNum, setRecipientAccNum] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [senderAccount, setSenderAccount] = useState<{ id: string; balance: number; account_number: string } | null>(null);

  // Recipient verification
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("accounts").select("id, balance, account_number").eq("user_id", user.id).limit(1).single()
      .then(({ data }) => { if (data) setSenderAccount(data); });
  }, [user]);

  // Verify recipient when account number reaches 11 digits
  useEffect(() => {
    const trimmed = recipientAccNum.trim();
    if (trimmed.length !== 11 || !/^\d{11}$/.test(trimmed)) {
      setVerifiedName(null);
      setVerifyError(null);
      return;
    }
    if (senderAccount && trimmed === senderAccount.account_number) {
      setVerifiedName(null);
      setVerifyError("Cannot send to yourself");
      return;
    }

    const verify = async () => {
      setVerifying(true);
      setVerifiedName(null);
      setVerifyError(null);

      const { data: recipientAcc, error } = await supabase
        .from("accounts")
        .select("user_id")
        .eq("account_number", trimmed)
        .maybeSingle();

      if (error || !recipientAcc) {
        setVerifyError("Account not found");
        setVerifying(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name")
        .eq("user_id", recipientAcc.user_id)
        .single();

      if (profile) {
        const name = profile.full_name || `${profile.first_name} ${profile.last_name}`.trim();
        setVerifiedName(name || "Account holder");
      } else {
        setVerifiedName("Account holder");
      }
      setVerifying(false);
    };
    verify();
  }, [recipientAccNum, senderAccount]);

  const handleSend = async () => {
    if (!user || !senderAccount) return;

    if (routingNumber.trim() !== ROUTING_NUMBER) {
      toast.error("Invalid routing number");
      return;
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > Number(senderAccount.balance)) { toast.error("Insufficient funds"); return; }
    if (!recipientAccNum.trim() || !/^\d{11}$/.test(recipientAccNum.trim())) { toast.error("Enter a valid 11-digit account number"); return; }
    if (recipientAccNum.trim() === senderAccount.account_number) { toast.error("Cannot send to yourself"); return; }
    if (!verifiedName) { toast.error("Please verify the recipient account first"); return; }

    setSending(true);

    const { data: recipientAcc, error: findErr } = await supabase
      .from("accounts")
      .select("id, user_id, balance, account_number")
      .eq("account_number", recipientAccNum.trim())
      .maybeSingle();

    if (findErr || !recipientAcc) {
      toast.error("Recipient account not found.");
      setSending(false);
      return;
    }

    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", recipientAcc.user_id)
      .single();

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const desc = description || "Money Transfer";
    const senderName = senderProfile?.full_name || user.email || "Someone";
    const recipientName = recipientProfile?.full_name || recipientAccNum;

    const { error: debitErr } = await supabase.from("transactions").insert({
      account_id: senderAccount.id,
      user_id: user.id,
      type: "debit",
      amount: amt,
      description: desc,
      status: "completed",
      recipient: recipientName,
    });

    if (debitErr) { toast.error("Transfer failed"); setSending(false); return; }

    await supabase.from("transactions").insert({
      account_id: recipientAcc.id,
      user_id: recipientAcc.user_id,
      type: "credit",
      amount: amt,
      description: desc,
      status: "completed",
      recipient: senderName,
    });

    await Promise.all([
      supabase.from("accounts").update({ balance: Number(senderAccount.balance) - amt }).eq("id", senderAccount.id),
      supabase.from("accounts").update({ balance: Number(recipientAcc.balance) + amt }).eq("id", recipientAcc.id),
    ]);

    toast.success(`$${amt.toLocaleString("en-US", { minimumFractionDigits: 2 })} sent successfully!`);
    setSenderAccount({ ...senderAccount, balance: Number(senderAccount.balance) - amt });
    setSuccess(true);
    setSending(false);
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-12 animate-fade-in">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-display font-bold">Transfer Complete!</h2>
              <p className="text-muted-foreground text-sm">
                ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} has been sent to {verifiedName || `account ${recipientAccNum}`}
              </p>
              <Button className="w-full" onClick={() => { setSuccess(false); setAmount(""); setRecipientAccNum(""); setRoutingNumber(""); setDescription(""); setVerifiedName(null); }}>
                Send Another
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Send Money</h1>
          <p className="text-sm text-muted-foreground mt-1">Transfer funds to another CashQuora account</p>
        </div>

        {senderAccount && (
          <Card className="bg-muted/40">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
                <p className="text-2xl font-display font-bold mt-0.5">
                  ${Number(senderAccount.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Account</p>
                <p className="text-xs text-muted-foreground font-mono">{senderAccount.account_number}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> Routing Number</Label>
              <Input
                placeholder="9-digit routing number"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                maxLength={9}
                className="font-mono"
              />
              {routingNumber.length === 9 && routingNumber !== ROUTING_NUMBER && (
                <p className="text-xs text-destructive">Invalid routing number</p>
              )}
              {routingNumber === ROUTING_NUMBER && (
                <p className="text-xs text-success">✓ CashQuora routing number verified</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Account Number</Label>
              <Input
                placeholder="11-digit account number"
                value={recipientAccNum}
                onChange={(e) => setRecipientAccNum(e.target.value.replace(/\D/g, "").slice(0, 11))}
                maxLength={11}
                className="font-mono"
              />
              {verifying && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verifying account...
                </div>
              )}
              {verifiedName && (
                <div className="flex items-center gap-2 text-xs text-success font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {verifiedName}
                </div>
              )}
              {verifyError && (
                <p className="text-xs text-destructive">{verifyError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Amount (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-display font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Note (optional)</Label>
              <Input
                placeholder="What's this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button className="w-full h-11 gap-2" onClick={handleSend} disabled={sending || !verifiedName}>
              {sending ? "Processing..." : "Send Money"}
              {!sending && <Send className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SendMoney;
