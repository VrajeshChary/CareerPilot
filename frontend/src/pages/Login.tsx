import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  setMockMode,
  getCustomApiUrl,
  setCustomApiUrl,
} from "@/services/mockBackend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  Server,
  Settings2,
  Check,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getCustomApiUrl());
  const navigate = useNavigate();

  const handleLaunchSandbox = (customEmail?: string) => {
    const userEmail = (customEmail || email).trim() || "candidate@careerpilot.ai";
    setMockMode(true);
    localStorage.setItem("token", "mock-sandbox-token-" + Date.now());
    localStorage.setItem("user_email", userEmail);
    toast.success("Connected to CareerPilot Interactive Sandbox Workspace.");
    navigate("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setNetworkError(false);

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
        setMockMode(false);
        navigate("/dashboard");
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email.trim());
        formData.append("password", password);
        const res = await api.post("/auth/login", formData);
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user_email", email.trim());
        setMockMode(false);
        toast.success("Signed in successfully.");
        navigate("/dashboard");
      }
    } catch (err: any) {
      if (
        err.isNetworkError ||
        !err.response ||
        err.code === "ERR_NETWORK" ||
        err.message?.includes("Network Error")
      ) {
        setNetworkError(true);
        toast.error("Cannot reach backend server. Running in cloud preview or server is offline.");
      } else {
        const msg = err.response?.data?.detail || "Authentication failed. Please verify credentials.";
        toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiUrl(apiUrlInput);
    setShowApiSettings(false);
    toast.success(`API Base URL updated to: ${apiUrlInput || "Default"}`);
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
          <CardContent className="pt-6 space-y-4">
            {/* Network Error Fallback Alert */}
            {networkError && (
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-300">Backend Server Unreachable</p>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      Could not connect to <span className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-200">{getCustomApiUrl() || "http://localhost:8000"}</span>.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleLaunchSandbox(email)}
                    className="w-full bg-amber-400 text-black hover:bg-amber-300 text-xs font-semibold h-8"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Launch Interactive Sandbox Mode
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowApiSettings(true)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 underline text-center pt-1"
                  >
                    Configure Custom Backend URL
                  </button>
                </div>
              </div>
            )}

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
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    {isRegister ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </Button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="flex-shrink mx-2 text-[10px] uppercase font-mono text-zinc-600 tracking-wider">
                Or Instant Preview
              </span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>

            {/* Instant Demo Sandbox Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleLaunchSandbox()}
              className="w-full border-zinc-800 bg-[#09090b] hover:bg-zinc-800/80 text-zinc-300 hover:text-white text-xs h-9 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-zinc-400" />
              Explore Interactive Sandbox Workspace
            </Button>
          </CardContent>

          <CardFooter className="pt-0 pb-4 flex flex-col items-center border-t border-zinc-800/60 mt-1 gap-2">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors pt-3"
            >
              {isRegister ? (
                <>
                  Already have an account?{" "}
                  <span className="underline underline-offset-4 text-zinc-200">Sign in</span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <span className="underline underline-offset-4 text-zinc-200">Create one</span>
                </>
              )}
            </button>
          </CardFooter>
        </Card>

        {/* API Endpoint & Settings Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
            >
              <Server className="w-3 h-3" />
              <span>API: {getCustomApiUrl() || "Interactive Sandbox"}</span>
              <Settings2 className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {showApiSettings && (
            <form
              onSubmit={handleSaveApiUrl}
              className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 space-y-2.5 animate-in fade-in"
            >
              <div className="space-y-1">
                <Label htmlFor="api-url" className="text-[11px] text-zinc-400">
                  Backend API Endpoint (e.g. Render, Railway, or local)
                </Label>
                <Input
                  id="api-url"
                  type="text"
                  placeholder="https://careerpilot-api.onrender.com"
                  className="h-8 text-xs bg-[#09090b] border-zinc-800 text-zinc-200 placeholder:text-zinc-700 font-mono"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setApiUrlInput("");
                    setCustomApiUrl("");
                    setMockMode(true);
                    toast.info("Switched to client sandbox mode.");
                  }}
                  className="h-7 text-[11px] text-zinc-400 hover:text-white"
                >
                  Reset to Sandbox
                </Button>
                <Button type="submit" size="sm" className="h-7 text-[11px] bg-zinc-200 text-black hover:bg-white font-medium">
                  <Check className="w-3 h-3 mr-1" />
                  Save URL
                </Button>
              </div>
            </form>
          )}

          {/* Minimalist footer */}
          <p className="text-center text-[11px] text-zinc-600 font-mono">
            CareerPilot • ATS Optimization & Vector RAG Engine
          </p>
        </div>
      </div>
    </div>
  );
}
