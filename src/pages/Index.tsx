import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DollarSign, Shield, ArrowRight, Zap, Globe, Lock, TrendingUp,
  Users, ChevronRight, Smartphone, CheckCircle2, Star, Send,
  BellRing, Fingerprint, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroPhone from "@/assets/hero-phone.png";
import heroPeople from "@/assets/hero-people.png";
import cardMockup from "@/assets/card-mockup.png";
import MarketTicker from "@/components/MarketTicker";
import WhatsAppFab from "@/components/WhatsAppFab";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const slideRight = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const slideLeft = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">Fidelity CashQuora</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security</a>
            <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Button onClick={() => navigate("/dashboard")} className="gap-2">
                Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
                  Sign In
                </Button>
                <Button onClick={() => navigate("/auth")} className="gap-2 shadow-lg shadow-primary/20">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Live market ticker */}
      <div className="pt-16">
        <MarketTicker variant="dark" />
      </div>

      {/* ══════════════ HERO ══════════════ */}
      <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-1/4 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/[0.06] rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/[0.02] rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left content */}
            <div>
              <motion.div
                initial="hidden" animate="visible" variants={fadeUp} custom={0}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-6"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>FDIC Insured • 256-bit Encryption</span>
              </motion.div>

              <motion.h1
                initial="hidden" animate="visible" variants={fadeUp} custom={1}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-[1.08] mb-6 tracking-tight"
              >
                Banking that
                <br />
                moves at{" "}
                <span className="text-primary relative">
                  your speed
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-1 bg-accent rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                </span>
                .
              </motion.h1>

              <motion.p
                initial="hidden" animate="visible" variants={fadeUp} custom={2}
                className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed"
              >
                Send, receive, and manage your money instantly. Zero hidden fees, no paperwork — just seamless digital banking built for the modern era.
              </motion.p>

              <motion.div
                initial="hidden" animate="visible" variants={fadeUp} custom={3}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 h-12 sm:h-13 px-6 sm:px-8 text-sm sm:text-base shadow-xl shadow-primary/25">
                  Open Free Account <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2 h-12 sm:h-13 px-6 sm:px-8 text-sm sm:text-base" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                  Learn More <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial="hidden" animate="visible" variants={fadeUp} custom={4}
                className="mt-10 flex items-center gap-6 text-xs text-muted-foreground"
              >
                <div className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary/60" /> FDIC Insured</div>
                <div className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary/60" /> Bank-Grade Security</div>
                <div className="flex items-center gap-1.5"><Fingerprint className="h-4 w-4 text-primary/60" /> AI Verified</div>
              </motion.div>
            </div>

            {/* Right: hero image */}
            <motion.div
              initial="hidden" animate="visible" variants={scaleIn}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative">
                <img
                  src={heroPhone}
                  alt="Fidelity CashQuora banking app dashboard"
                  width={420}
                  height={540}
                  className="relative z-10 drop-shadow-2xl"
                />
                <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />

                {/* Floating card */}
                <motion.div
                  className="absolute -left-6 sm:-left-16 bottom-20 z-20"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <div className="bg-card border border-border/60 rounded-xl p-3 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Transfer Complete</p>
                        <p className="text-sm font-semibold">+$2,450.00</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating notification */}
                <motion.div
                  className="absolute -right-4 sm:-right-12 top-24 z-20"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
                >
                  <div className="bg-card border border-border/60 rounded-xl p-3 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                        <BellRing className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Security Alert</p>
                        <p className="text-xs font-medium">New login verified ✓</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={5}
            className="mt-16 sm:mt-24 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6 sm:p-8"
          >
            {[
              { value: "$2.4B+", label: "Transfers Processed" },
              { value: "500K+", label: "Active Users" },
              { value: "99.99%", label: "Uptime Guaranteed" },
              { value: "< 3s", label: "Transfer Speed" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl sm:text-3xl font-display font-bold text-foreground">{stat.value}</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-14 sm:mb-20"
          >
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mt-3 mb-4">
              Everything you need,{" "}
              <span className="text-primary">nothing you don't.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              We stripped away the complexity of traditional banking and built something people actually love using.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: Zap, title: "Instant Transfers", desc: "Send money to any Fidelity CashQuora user in seconds — no waiting, no holds, no limits.", color: "bg-accent/10 text-accent" },
              { icon: Lock, title: "Bank-Grade Security", desc: "256-bit encryption, AI-powered fraud detection, and FDIC insurance on every dollar.", color: "bg-primary/10 text-primary" },
              { icon: Globe, title: "Access Anywhere", desc: "Manage your money from any device, any time. Your bank is always in your pocket.", color: "bg-success/10 text-success" },
              { icon: TrendingUp, title: "Real-Time Tracking", desc: "Every transaction, balance update, and alert — live and in real time.", color: "bg-warning/10 text-warning" },
              { icon: Fingerprint, title: "AI KYC Verification", desc: "Snap a selfie, verify your identity in under 60 seconds, and start banking.", color: "bg-destructive/10 text-destructive" },
              { icon: CreditCard, title: "Zero Hidden Fees", desc: "No maintenance fees, no minimum balance, no surprises. Banking as it should be.", color: "bg-accent/10 text-accent" },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="group p-6 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-14 sm:mb-20"
          >
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mt-3 mb-4">
              Start banking in <span className="text-primary">3 simple steps.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              From signup to your first transfer — it takes less than 5 minutes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                step: "01", icon: Users, title: "Create Your Account",
                desc: "Fill in your details, snap a quick selfie for AI verification, and you're in.",
              },
              {
                step: "02", icon: Shield, title: "Get Verified Instantly",
                desc: "Our AI-powered KYC verifies your identity in under 60 seconds. No paperwork needed.",
              },
              {
                step: "03", icon: Send, title: "Send & Receive Money",
                desc: "Transfer funds to anyone with a Fidelity CashQuora account instantly using their account number.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="relative text-center"
              >
                <div className="text-6xl sm:text-7xl font-display font-bold text-primary/[0.07] absolute -top-4 left-1/2 -translate-x-1/2">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ LIFESTYLE SECTION ══════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideRight}
            >
              <div className="relative">
                <img
                  src={heroPeople}
                  alt="Happy Fidelity CashQuora users"
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="rounded-3xl shadow-2xl"
                />
                <div className="absolute -bottom-4 -right-4 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />
              </div>
            </motion.div>

            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideLeft}
            >
              <span className="text-accent font-semibold text-sm uppercase tracking-wider">Built for Everyone</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mt-3 mb-6">
                Banking that fits
                <br />
                <span className="text-primary">your lifestyle.</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Whether you're splitting dinner, paying rent, or sending money to family — Fidelity CashQuora makes it effortless. Real people, real transactions, real-time.
              </p>
              <div className="space-y-4">
                {[
                  "Instant peer-to-peer transfers with zero fees",
                  "Real-time notifications on every transaction",
                  "AI-verified identity protection for every user",
                  "Accessible from any device, anywhere",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════ SECURITY ══════════════ */}
      <section id="security" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideRight}
              className="order-2 lg:order-1"
            >
              <span className="text-accent font-semibold text-sm uppercase tracking-wider">Security First</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold mt-3 mb-6">
                Your money is{" "}
                <span className="text-primary">always protected.</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                We use the same security infrastructure trusted by the world's largest financial institutions. Every layer of Fidelity CashQuora is designed to keep your money safe.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Lock, label: "256-bit AES Encryption" },
                  { icon: Fingerprint, label: "Biometric AI Verification" },
                  { icon: Shield, label: "FDIC Insured Deposits" },
                  { icon: BellRing, label: "Real-Time Fraud Alerts" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/40">
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}
              className="order-1 lg:order-2 flex justify-center"
            >
              <div className="relative">
                <img
                  src={cardMockup}
                  alt="Fidelity CashQuora secure banking card"
                  loading="lazy"
                  width={400}
                  height={256}
                  className="drop-shadow-2xl"
                />
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotateY: [0, 5, 0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  style={{ perspective: 800 }}
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-primary/10 rounded-full blur-2xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-14"
          >
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mt-3 mb-4">
              Loved by <span className="text-primary">thousands.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "Sarah Mitchell", role: "Small Business Owner", text: "Fidelity CashQuora changed how I handle payments. Transfers are instant and the app is incredibly intuitive. I've never felt this confident about digital banking.", rating: 5 },
              { name: "James Rodriguez", role: "Freelance Designer", text: "The KYC process took less than a minute. I was verified and sending money within 5 minutes of downloading. That's unheard of.", rating: 5 },
              { name: "Emily Chen", role: "Graduate Student", text: "I split rent with 3 roommates every month. Fidelity CashQuora makes it seamless — no more Venmo drama. And zero fees? That's a game changer.", rating: 5 },
            ].map((review, i) => (
              <motion.div
                key={review.name}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="p-6 rounded-2xl bg-card border border-border/40"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{review.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {review.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ APP SHOWCASE ══════════════ */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Mobile First</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mt-3 mb-4">
              Your bank,{" "}
              <span className="text-primary">always in your pocket.</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-12 text-sm sm:text-base">
              Designed for the way you live. Check balances, send money, and track spending — all from your phone.
            </p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}
            className="relative inline-block"
          >
            <img
              src={heroPhone}
              alt="Fidelity CashQuora mobile app"
              loading="lazy"
              width={320}
              height={410}
              className="drop-shadow-2xl mx-auto"
            />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-64 h-16 bg-primary/10 rounded-full blur-3xl" />
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
          >
            {[
              { icon: Smartphone, label: "iOS & Android" },
              { icon: Zap, label: "Instant Sync" },
              { icon: BellRing, label: "Push Alerts" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs sm:text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}
          className="max-w-5xl mx-auto text-center bg-primary rounded-3xl p-10 sm:p-16 lg:p-20 relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.07]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-accent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-5 leading-tight">
              Ready to bank smarter?
            </h2>
            <p className="text-primary-foreground/70 mb-10 max-w-lg mx-auto text-sm sm:text-base">
              Join hundreds of thousands who trust Fidelity CashQuora for fast, secure, and fee-free banking. Open your account in under 5 minutes.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="gap-2 h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base shadow-xl"
            >
              Create Your Free Account <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="border-t border-border/40 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold">Fidelity CashQuora</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Modern digital banking for the modern world. FDIC insured.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="hover:text-foreground transition-colors cursor-pointer">Personal Banking</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Business Banking</li>
                <li className="hover:text-foreground transition-colors cursor-pointer">Transfers</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="/pages/about" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="/contact" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="/pages/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="/pages/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Fidelity CashQuora, Inc. All rights reserved. FDIC Insured. Equal Housing Lender.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> FDIC</span>
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL</span>
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> PCI DSS</span>
            </div>
          </div>
        </div>
      </footer>

      <WhatsAppFab />
    </div>
  );
};

export default Index;
