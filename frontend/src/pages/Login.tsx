import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, CheckCircle2, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await api.post("/auth/register", { email, password });
        toast.success("Account created successfully! Signing you in...");
        // Auto sign in after register
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);
        const res = await api.post("/auth/login", formData);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user_email", email);
        navigate("/dashboard");
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);
        const res = await api.post("/auth/login", formData);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user_email", email);
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail("candidate@careerpilot.ai");
    setPassword("CareerPilot2026!");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden px-4">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-950/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[200px] bg-indigo-950/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 py-10">
        {/* Left Column: Brand & Value Pitch */}
        <div className="lg:col-span-7 space-y-6 lg:pr-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Next-Gen Career Intelligence Platform</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
              Precision Resume Audit & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400">
                AI Career Strategist
              </span>
            </h1>
            <p className="text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
              Stop guessing why your resume gets filtered out. Get deterministic ATS readability scoring, 
              bullet-point impact rewrites, semantic job-fit gap analysis, and grounded RAG interview coaching.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm space-y-1">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Deterministic ATS Score</span>
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Checks keyword density, quantifiable impact, action verbs, and structural compliance.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>ChromaDB Vector RAG</span>
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                Answers are grounded strictly in your verified experience without hallucinations.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Form */}
        <div className="lg:col-span-5">
          <Card className="border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl shadow-2xl text-zinc-100">
            <CardHeader className="space-y-1.5 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  {isRegister ? "Create Account" : "Welcome Back"}
                </CardTitle>
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium border border-sky-950 bg-sky-950/40 px-2.5 py-1 rounded-md"
                >
                  Fill Demo
                </button>
              </div>
              <CardDescription className="text-zinc-400 text-xs">
                {isRegister
                  ? "Enter your email to initialize your private career workspace"
                  : "Access your indexed resumes, audit scorecards, and AI coach"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-zinc-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="engineer@company.com"
                      required
                      className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/20 text-sm h-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-zinc-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      required
                      className="pl-9 pr-9 bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/20 text-sm h-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold h-10 text-sm transition-all shadow-md mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isRegister ? "Get Started" : "Sign In to Workspace"}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="pt-0 flex flex-col gap-3">
              <div className="relative w-full text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <span className="relative bg-zinc-900 px-2 text-xs text-zinc-500">
                  {isRegister ? "Already registered?" : "New to CareerPilot?"}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-300 text-xs h-9"
                onClick={() => setIsRegister(!isRegister)}
              >
                {isRegister ? "Switch to Sign In" : "Create a Free Workspace Account"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
