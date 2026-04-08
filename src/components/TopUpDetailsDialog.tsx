import { Building2, Copy, Landmark, Router, WalletCards } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PublicAppConfig } from "@/lib/publicAppConfig";

interface TopUpDetailsDialogProps {
  details: PublicAppConfig;
  onCopy: (value: string, label: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const TopUpDetailsDialog = ({ details, onCopy, onOpenChange, open }: TopUpDetailsDialogProps) => {
  const rows = [
    { icon: Landmark, label: "Account name", value: details.topup_account_name },
    { icon: Building2, label: "Bank name", value: details.topup_bank_name },
    { icon: WalletCards, label: "Account type", value: details.topup_account_type },
    { icon: Copy, label: "Account number", value: details.topup_account_number },
    { icon: Router, label: "ACH routing", value: details.topup_routing_ach },
    { icon: Router, label: "Wire routing", value: details.topup_routing_wire },
  ].filter((row) => row.value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-border/70 bg-card p-0">
        <div className="relative overflow-hidden bg-primary px-6 py-6 text-primary-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.35),transparent_45%)]" />
          <div className="relative space-y-2">
            <div className="inline-flex rounded-full bg-primary-foreground/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              Add money manually
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-display text-primary-foreground">Top Up Account Details</DialogTitle>
            </DialogHeader>
            <p className="max-w-md text-sm text-primary-foreground/70">
              Send a bank transfer to the account below and your admin can reconcile your funding manually.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Top-up details are not configured yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">Please contact support or check back shortly.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                        <row.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{row.label}</p>
                        <p className="truncate text-sm font-semibold text-foreground">{row.value}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => row.value && onCopy(row.value, row.label)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
                Use your name as the transfer reference and keep your transfer receipt for quicker balance funding.
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpDetailsDialog;