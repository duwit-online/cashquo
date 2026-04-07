import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { DollarSign, Shield, ArrowRight, Camera, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { US_STATES } from "@/lib/us-states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";

const STORAGE_KEY = "cashquora_signup_form";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // KYC selfie state
  const [step, setStep] = useState<"form" | "selfie">("form");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Restore saved form data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.email) setEmail(data.email);
        if (data.state) setState(data.state);
        if (data.town) setTown(data.town);
        if (data.postalCode) setPostalCode(data.postalCode);
        if (data.gender) setGender(data.gender);
        if (data.step) setStep(data.step);
        if (data.isLogin !== undefined) setIsLogin(data.isLogin);
      }
    } catch {}
  }, []);

  // Save form data on change
  useEffect(() => {
    if (!isLogin) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        firstName, lastName, email, state, town, postalCode, gender, step, isLogin,
      }));
    }
  }, [firstName, lastName, email, state, town, postalCode, gender, step, isLogin]);

  const clearSavedForm = () => localStorage.removeItem(STORAGE_KEY);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error("Camera access denied. Please allow camera access for identity verification.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const captureSelfie = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (blob) {
        setSelfieBlob(blob);
        setSelfiePreview(URL.createObjectURL(blob));
        stopCamera();

        // AI face verification
        setVerifyingFace(true);
        setFaceVerified(false);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1];
            const { data, error } = await supabase.functions.invoke("verify-face", {
              body: { image_base64: base64, gender },
            });
            if (error) {
              toast.error("Face verification failed. Please retake.");
              setVerifyingFace(false);
              return;
            }
            if (!data.has_face || !data.is_real) {
              toast.error(data.reason || "No valid face detected. Please take a clear selfie.");
              setVerifyingFace(false);
              return;
            }
            if (gender && data.gender_match === false) {
              toast.error(`Face does not match selected gender. ${data.reason || ""}`);
              setVerifyingFace(false);
              return;
            }
            setFaceVerified(true);
            setVerifyingFace(false);
            toast.success("Face verified successfully!");
          };
          reader.readAsDataURL(blob);
        } catch {
          toast.error("Verification error. Please try again.");
          setVerifyingFace(false);
        }
      }
    }, "image/jpeg", 0.85);
  }, [stopCamera, gender]);

  const retakeSelfie = () => {
    setSelfieBlob(null);
    setSelfiePreview(null);
    setFaceVerified(false);
    setVerifyingFace(false);
    startCamera();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      handleLogin();
    } else {
      if (!gender) { toast.error("Please select your gender"); return; }
      setStep("selfie");
      setTimeout(() => startCamera(), 300);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      supabase.functions.invoke("trigger-email", {
        body: { trigger_type: "login", recipient_email: email, variables: { account_name: email, email } },
      }).catch(() => {});
      clearSavedForm();
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!selfieBlob) { toast.error("Please take a selfie for identity verification"); return; }
    if (!faceVerified) { toast.error("Please wait for face verification to complete"); return; }

    setLoading(true);
    const { data: authData, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName, last_name: lastName,
          state, town, postal_code: postalCode,
          plain_password: password, gender,
        },
      },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }

    if (authData.user) {
      const filePath = `${authData.user.id}/avatar.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, selfieBlob, { contentType: "image/jpeg", upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", authData.user.id);
        }
      }

      // Get account number for email
      const { data: accData } = await supabase.from("accounts").select("account_number").eq("user_id", authData.user.id).single();

      supabase.functions.invoke("trigger-email", {
        body: {
          trigger_type: "signup",
          recipient_email: email,
          variables: {
            account_name: `${firstName} ${lastName}`.trim(),
            email,
            account_number: accData?.account_number || "Pending",
          },
        },
      }).catch(() => {});
    }

    toast.success("Account created! You can now sign in.");
    stopCamera();
    clearSavedForm();
    setStep("form");
    setIsLogin(true);
    setLoading(false);
  };

  const handleBackToForm = () => {
    stopCamera();
    setSelfieBlob(null);
    setSelfiePreview(null);
    setFaceVerified(false);
    setVerifyingFace(false);
    setStep("form");
  };

  return (
    <div className="flex min-h-screen">
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
          <div className="flex items-center gap-2"><Shield className="h-4 w-4" /><span>FDIC Insured</span></div>
          <div className="flex items-center gap-2"><Shield className="h-4 w-4" /><span>256-bit Encryption</span></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background relative">
        <div className="absolute top-4 right-4"><ThemeToggle /></div>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">CashQuora</span>
          </div>

          {step === "form" && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-display font-bold text-foreground">
                  {isLogin ? "Welcome back" : "Open your account"}
                </h2>
                <p className="text-muted-foreground text-sm mt-1.5">
                  {isLogin ? "Sign in to manage your accounts" : "Get started with CashQuora in minutes"}
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="text-xs">First Name</Label>
                        <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">State</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-60">
                            {US_STATES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="town" className="text-xs">City / Town</Label>
                        <Input id="town" value={town} onChange={(e) => setTown(e.target.value)} placeholder="Los Angeles" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="postalCode" className="text-xs">Zip Code</Label>
                        <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="90001" required />
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
                  {loading ? "Please wait..." : isLogin ? "Sign In" : "Continue to Verification"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button onClick={() => { setIsLogin(!isLogin); clearSavedForm(); }} className="text-accent font-semibold hover:underline">
                  {isLogin ? "Open an account" : "Sign in"}
                </button>
              </p>
            </>
          )}

          {step === "selfie" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex p-3 rounded-2xl bg-accent/10 text-accent mb-4">
                  <Shield className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-display font-bold">Identity Verification</h2>
                <p className="text-muted-foreground text-sm mt-1.5">
                  Take a clear selfie for KYC verification. AI will verify your identity.
                </p>
              </div>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {!selfiePreview ? (
                    <div className="relative">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover bg-black" style={{ transform: "scaleX(-1)" }} />
                      {!cameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <div className="text-center space-y-3">
                            <Camera className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground">Starting camera...</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-60 border-2 border-dashed border-white/40 rounded-[50%]" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={selfiePreview} alt="Selfie" className="w-full aspect-square object-cover" style={{ transform: "scaleX(-1)" }} />
                      {verifyingFace && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-center text-white space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                            <p className="text-sm">Verifying face...</p>
                          </div>
                        </div>
                      )}
                      {faceVerified && (
                        <div className="absolute top-3 right-3">
                          <div className="p-1.5 rounded-full bg-success text-white">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                {!selfiePreview ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={handleBackToForm}>Back</Button>
                    <Button className="flex-1 gap-2" onClick={captureSelfie} disabled={!cameraActive}>
                      <Camera className="h-4 w-4" /> Capture
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1 gap-2" onClick={retakeSelfie}>
                      <RefreshCw className="h-4 w-4" /> Retake
                    </Button>
                    <Button className="flex-1 gap-2" onClick={handleSignup} disabled={loading || verifyingFace || !faceVerified}>
                      {loading ? "Creating Account..." : verifyingFace ? "Verifying..." : "Create Account"}
                      {!loading && !verifyingFace && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </>
                )}
              </div>

              <div className="text-center">
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  AI-powered verification • Your photo is encrypted and stored securely
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
