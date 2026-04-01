import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DollarSign, Shield, ArrowRight } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
            state,
            town,
            postal_code: postalCode,
            plain_password: password,
          },
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! You can now sign in.");
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-accent-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-primary-foreground">CashQuora</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-primary-foreground leading-tight mb-6">
            Banking made<br />simple & secure.
          </h1>
          <p className="text-lg text-primary-foreground/60 max-w-md">
            Send, receive, and manage your money with confidence. Your trusted digital banking partner.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-6 text-primary-foreground/50 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>FDIC Insured</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>256-bit Encryption</span>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">CashQuora</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground">
              {isLogin ? "Welcome back" : "Open your account"}
            </h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isLogin ? "Sign in to manage your accounts" : "Get started with CashQuora in minutes"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required={!isLogin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required={!isLogin} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs">State</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="California" required={!isLogin} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="town" className="text-xs">City / Town</Label>
                    <Input id="town" value={town} onChange={(e) => setTown(e.target.value)} placeholder="Los Angeles" required={!isLogin} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postalCode" className="text-xs">Zip Code</Label>
                    <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="90001" required={!isLogin} />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-accent font-semibold hover:underline">
              {isLogin ? "Open an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
