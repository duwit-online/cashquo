import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Landmark } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 text-primary">
              <Landmark className="h-8 w-8" />
              <span className="text-2xl font-display font-bold">NexusBank</span>
            </div>
          </div>
          <CardTitle className="text-xl font-display">
            {isLogin ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to access your accounts" : "Get started with NexusBank today"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required={!isLogin} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required={!isLogin} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="California" required={!isLogin} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="town">Town</Label>
                    <Input id="town" value={town} onChange={(e) => setTown(e.target.value)} placeholder="Los Angeles" required={!isLogin} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="90001" required={!isLogin} />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-accent font-medium hover:underline">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
