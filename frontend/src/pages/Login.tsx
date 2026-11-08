import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail, Eye, EyeOff } from "lucide-react";

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
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await api.post("/auth/register", { email: email.trim(), password });
        toast.success("Account created successfully. Signing in...");
        const formData = new URLSearchParams();
        formData.append("username", email.trim());
        formData.append("password", password);
        const res = await api.post("/auth/login", formData);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user_email", email.trim());
        navigate("/dashboard");
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email.trim());
        formData.append("password", password);
        const res = await api.post("/auth/login", formData);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user_email", email.trim());
        toast.success("Signed in successfully.");
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-zinc-100 px-4 select-none">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-9 h-9 rounded-lg bg-zinc-100 text-zinc-950 items-center justify-center font-bold text-sm tracking-tighter mx-auto shadow-sm">
            CP
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">CareerPilot</h1>
          <p className="text-xs text-zinc-400">
            {isRegister ? "Create a new workspace account" : "Sign in to your career workspace"}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md shadow-xl">
          <CardHeader className="sr-only">
            <CardTitle>{isRegister ? "Register" : "Login"}</CardTitle>
            <CardDescription>Authentication Form</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-zinc-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@work.com"
                    autoComplete="email"
                    required
                    className="pl-9 bg-[#09090b] border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 h-9 text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-zinc-300">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    required
                    className="pl-9 pr-9 bg-[#09090b] border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-700 h-9 text-xs"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-semibold h-9 text-xs mt-2 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    {isRegister ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0 pb-5 flex justify-center border-t border-zinc-800/60 mt-1">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors pt-3"
            >
              {isRegister ? (
                <>Already have an account? <span className="underline underline-offset-4 text-zinc-200">Sign in</span></>
              ) : (
                <>Don&apos;t have an account? <span className="underline underline-offset-4 text-zinc-200">Create one</span></>
              )}
            </button>
          </CardFooter>
        </Card>

        {/* Minimalist footer */}
        <p className="text-center text-[11px] text-zinc-600 font-mono">
          CareerPilot • ATS Optimization & Vector RAG Engine
        </p>
      </div>
    </div>
  );
}
