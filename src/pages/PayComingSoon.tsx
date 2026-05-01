import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Globe,
  Layers3,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Tv,
  Wifi,
  Zap,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Globe,
    title: "Connect",
    description: "Securely link your payment accounts in seconds and centralize every recurring bill in one place.",
  },
  {
    icon: CalendarClock,
    title: "Set",
    description: "Choose limits, due dates, and bill categories you want Fidelity CashQuora to handle automatically.",
  },
  {
    icon: Repeat2,
    title: "Forget",
    description: "We’ll schedule payments on time, help reduce missed bills, and keep your recurring life organized.",
  },
];

const futureFeatures = [
  "Automatic bill pay scheduling",
  "Subscription control and renewal reminders",
  "Smart balance checks before payment runs",
  "One place for utilities, streaming, mobile, and rent",
  "Priority alerts before any bill becomes overdue",
  "Clean receipt history for every automated payment",
];

const billers = [
  "Netflix",
  "Disney+",
  "Spotify",
  "YouTube Premium",
  "Hulu",
  "AT&T",
  "Verizon",
  "T-Mobile",
  "Xfinity",
  "Power",
  "Water",
  "Internet",
  "Gym",
  "Insurance",
  "Rent",
  "Clubs",
];

const categoryCards = [
  {
    icon: Tv,
    title: "Entertainment",
    description: "Streaming and subscription services like Netflix, Disney+, Spotify, YouTube Premium, and Hulu.",
  },
  {
    icon: Zap,
    title: "Utilities",
    description: "Electricity, water, gas, and other monthly household essentials with recurring due dates.",
  },
  {
    icon: Wifi,
    title: "Internet & Mobile",
    description: "Internet plans, mobile lines, cable, and broadband services with automatic monthly billing.",
  },
  {
    icon: CreditCard,
    title: "Lifestyle",
    description: "Gym memberships, insurance plans, rent support, clubs, and recurring personal services.",
  },
];

const PayComingSoon = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-8 animate-fade-in">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card px-6 py-8 shadow-sm lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.12),transparent_40%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.12),transparent_35%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Bill Pay Coming Soon
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-display font-bold leading-tight tracking-tight text-foreground lg:text-6xl">
                  Total financial automation is coming to Fidelity CashQuora.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:text-lg">
                  Soon you’ll be able to automate bills, recurring subscriptions, and everyday obligations from one premium dashboard — with better visibility, smarter timing, and a calmer monthly routine.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="gap-2" onClick={() => navigate("/send")}>
                  Use transfers for now <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {futureFeatures.slice(0, 4).map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <p className="text-sm text-foreground">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute right-5 top-5 z-20 rotate-12 rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent-foreground shadow-lg">
                Coming soon
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-background p-4 shadow-2xl shadow-primary/10">
                <div className="rounded-[1.5rem] border border-border/70 bg-card p-4 blur-[2px]">
                  <div className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/65">Autopay center</p>
                      <p className="mt-1 text-xl font-display font-bold">$1,246.00 scheduled</p>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-accent" />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {[
                      ["Netflix", "$15.99", "Apr 12"],
                      ["AT&T Wireless", "$92.41", "Apr 15"],
                      ["Power Utility", "$124.00", "Apr 18"],
                      ["Gym Membership", "$39.99", "Apr 21"],
                    ].map(([name, amount, date]) => (
                      <div key={name} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">Autopay on {date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{amount}</p>
                          <p className="text-xs text-success">Scheduled</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      ["Active bills", "16"],
                      ["Saved this month", "$84"],
                      ["On-time score", "100%"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-muted/60 px-3 py-4 text-center">
                        <p className="text-lg font-display font-bold text-foreground">{value}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
            >
              <Card className="h-full border-border/70 bg-card/90">
                <CardContent className="space-y-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Step {index + 1}</p>
                    <h2 className="mt-2 text-xl font-display font-bold text-foreground">{step.title}</h2>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-border/70 bg-card px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Pay your favorites automatically</p>
              <h2 className="mt-2 text-3xl font-display font-bold text-foreground">Future support across the bills people actually pay every month.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              We’re designing one intelligent bill-pay layer for entertainment, utilities, internet, mobile, rent, insurance, and recurring lifestyle payments.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-border/70 bg-background/70 px-4 py-4">
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
              className="flex w-max gap-3"
            >
              {[...billers, ...billers].map((biller, index) => (
                <div key={`${biller}-${index}`} className="rounded-2xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm">
                  {biller}
                </div>
              ))}
            </motion.div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {categoryCards.map((card) => (
              <Card key={card.title} className="border-border/70 bg-background/70">
                <CardContent className="space-y-4 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-foreground">{card.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{card.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/70 bg-card">
            <CardContent className="p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Why this matters</p>
                  <h2 className="mt-1 text-2xl font-display font-bold text-foreground">Designed to remove bill stress from your month.</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {futureFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <p className="text-sm text-foreground">{feature}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-primary text-primary-foreground">
            <CardContent className="space-y-4 p-6 lg:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">Launch message</p>
              <h2 className="text-3xl font-display font-bold">One dashboard. Every recurring payment.</h2>
              <p className="text-sm leading-7 text-primary-foreground/75">
                Fidelity CashQuora Bill Pay will bring your subscriptions, utilities, phone bills, and recurring essentials into one beautifully automated workflow.
              </p>
              <Button variant="secondary" className="w-full" onClick={() => navigate("/dashboard")}>Continue using Fidelity CashQuora today</Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default PayComingSoon;