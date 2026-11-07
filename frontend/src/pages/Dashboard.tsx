import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  MessageSquare,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Briefcase,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Send,
  User,
  Bot,
  Sun,
  Moon,
  ChevronRight,
  FileCheck,
  Edit3,
  BookmarkPlus,
  Save,
  Download,
  Building2,
  Plus,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import ReactMarkdown from "react-markdown";

interface ResumeItem {
  id: number;
  filename: string;
  title?: string;
  file_size?: number;
  ats_score?: number;
  is_primary?: boolean;
  version?: number;
  has_analysis?: boolean;
  preview_snippet?: string;
  created_at: string;
  updated_at?: string;
}

interface JobApplicationItem {
  id: number;
  company_name: string;
  job_title: string;
  job_description: string;
  match_score?: number;
  match_analysis?: any;
  status: string;
  notes?: string;
  created_at: string;
}

interface ScoreData {
  Overall_score: number;
  ATS_score: number;
  Readability: number;
  Technical_Skills: number;
  Leadership: number;
  Impact: number;
  Formatting: number;
  Grammar: number;
  word_count?: number;
  metric_count?: number;
  action_verb_count?: number;
  readability_details?: {
    flesch_reading_ease: number;
    avg_words_per_sentence: number;
    estimated_reading_time_min: number;
    frequent_repetitions: string[];
  };
  skills_breakdown?: Record<string, string[]>;
  all_skills?: string[];
  bullet_rewrites?: Array<{ original: string; improved: string; reason: string }>;
  red_flags?: string[];
  strengths?: string[];
  summary_critique?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    "audit" | "editor" | "matcher" | "tracker" | "coach" | "toolkit" | "library"
  >("audit");

  // Resumes list & active resume
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [activeResumeDetail, setActiveResumeDetail] = useState<any>(null);

  // Resume Editor State
  const [editedText, setEditedText] = useState<string>("");
  const [savingEditor, setSavingEditor] = useState<boolean>(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Analysis state
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("auto");

  // Single bullet rewrite tool
  const [customBulletInput, setCustomBulletInput] = useState<string>("");
  const [customRewrites, setCustomRewrites] = useState<Array<{ style: string; rewrite: string; rationale: string }>>([]);
  const [rewritingBullet, setRewritingBullet] = useState<boolean>(false);

  // System & theme state
  const [systemInfo, setSystemInfo] = useState<any>({ active_provider: "auto", vector_db: "ChromaDB" });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Job Matcher state
  const [jobDescription, setJobDescription] = useState("");
  const [matcherCompany, setMatcherCompany] = useState("");
  const [matcherTitle, setMatcherTitle] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);

  // Job Applications Tracker state
  const [applications, setApplications] = useState<JobApplicationItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  // Career Coach (Chat) state
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content:
        "**Welcome to CareerPilot Studio.**\n\nI have indexed your resume vectors into persistent ChromaDB storage. You can ask me to **audit your bullet points**, **simulate technical interview questions**, or **tailor your experience** for specific roles.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Cover Letter & Interview prep state
  const [coverLetterContext, setCoverLetterContext] = useState("");
  const [coverLetterTone, setCoverLetterTone] = useState("Confident");
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState("");

  const [interviewRoleContext, setInterviewRoleContext] = useState("");
  const [generatingInterview, setGeneratingInterview] = useState(false);
  const [interviewData, setInterviewData] = useState<any>(null);

  // Modals & clipboard state
  const [viewTextModal, setViewTextModal] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const userEmail = localStorage.getItem("user_email") || "candidate@careerpilot.ai";

  useEffect(() => {
    fetchResumes();
    fetchSystemStatus();
    fetchApplications();
    document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await api.get("/system/status");
      setSystemInfo(res.data);
    } catch {
      // Ignore
    }
  };

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const res = await api.get("/applications/");
      setApplications(res.data);
    } catch {
      // Ignore
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchResumes = async (selectLatest = false) => {
    try {
      const res = await api.get("/resume/");
      const data: ResumeItem[] = res.data;
      setResumes(data);

      if (data.length > 0) {
        const idToSelect = selectLatest ? data[0].id : selectedResumeId || data[0].id;
        loadResumeDetails(idToSelect);
      } else {
        setSelectedResumeId(null);
        setActiveResumeDetail(null);
        setScoreData(null);
        setEditedText("");
      }
    } catch (err: any) {
      toast.error("Failed to fetch resumes from server.");
    }
  };

  const loadResumeDetails = async (id: number) => {
    setSelectedResumeId(id);
    try {
      const res = await api.get(`/resume/${id}`);
      setActiveResumeDetail(res.data);
      setEditedText(res.data.parsed_text || "");
      if (res.data.analysis_data) {
        setScoreData(res.data.analysis_data);
      } else {
        triggerAnalysis(id, false);
      }
    } catch {
      toast.error("Failed to load resume details.");
    }
  };

  const triggerAnalysis = async (id: number, forceRefresh = true) => {
    setAnalyzing(true);
    try {
      const res = await api.get(`/analysis/${id}/score?refresh=${forceRefresh}&provider=${selectedModel}`);
      setScoreData(res.data.score_data);
      toast.success(forceRefresh ? "Deep ATS re-audit completed!" : "Diagnostic loaded.");
      const listRes = await api.get("/resume/");
      setResumes(listRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await api.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message || "Resume uploaded and indexed!");
      setSelectedFile(null);
      await fetchResumes(true);
      setActiveTab("audit");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed. Please ensure file is valid PDF, DOCX or TXT.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEditedResume = async () => {
    if (!selectedResumeId) return;
    setSavingEditor(true);
    try {
      const res = await api.put(`/resume/${selectedResumeId}`, {
        parsed_text: editedText,
      });
      toast.success(`Updated to version v${res.data.version}. New ATS Score: ${res.data.ats_score}/100`);
      await loadResumeDetails(selectedResumeId);
      const listRes = await api.get("/resume/");
      setResumes(listRes.data);
    } catch (err: any) {
      toast.error("Failed to update resume text.");
    } finally {
      setSavingEditor(false);
    }
  };

  const handleDeleteResume = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this resume and its indexed vectors?")) return;
    try {
      await api.delete(`/resume/${id}`);
      toast.success("Resume deleted.");
      fetchResumes(true);
    } catch {
      toast.error("Could not delete resume.");
    }
  };

  const handleJobMatch = async () => {
    if (!selectedResumeId) {
      toast.error("Please select a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please paste a target job description.");
      return;
    }
    setMatching(true);
    try {
      const res = await api.post(`/analysis/match?provider=${selectedModel}`, {
        resume_id: selectedResumeId,
        job_description: jobDescription,
      });
      setMatchResult(res.data.match_data);
      toast.success("Job description match calculated!");
    } catch (err: any) {
      toast.error("Failed to run match analysis.");
    } finally {
      setMatching(false);
    }
  };

  const handleSaveToTracker = async () => {
    if (!jobDescription.trim()) {
      toast.error("Please enter a job description.");
      return;
    }
    try {
      await api.post("/applications/", {
        company_name: matcherCompany.trim() || "Target Company",
        job_title: matcherTitle.trim() || "Software Engineer",
        job_description: jobDescription,
        resume_id: selectedResumeId,
        status: "Saved",
      });
      toast.success("Job saved to Application Tracker!");
      fetchApplications();
    } catch {
      toast.error("Could not save to tracker.");
    }
  };

  const handleUpdateAppStatus = async (appId: number, newStatus: string) => {
    try {
      await api.patch(`/applications/${appId}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchApplications();
    } catch {
      toast.error("Failed to update application status.");
    }
  };

  const handleDeleteApp = async (appId: number) => {
    try {
      await api.delete(`/applications/${appId}`);
      toast.success("Application removed.");
      fetchApplications();
    } catch {
      toast.error("Failed to delete application.");
    }
  };

  const handleRewriteSingleBullet = async () => {
    if (!customBulletInput.trim()) return;
    setRewritingBullet(true);
    try {
      const res = await api.post("/analysis/rewrite-bullet", {
        bullet: customBulletInput,
        provider: selectedModel,
      });
      setCustomRewrites(res.data.rewrites || []);
      toast.success("Generated 3 tailored rewrites!");
    } catch {
      toast.error("Failed to rewrite bullet.");
    } finally {
      setRewritingBullet(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedResumeId) return;
    try {
      const res = await api.get(`/resume/${selectedResumeId}/export`);
      const blob = new Blob([res.data], { type: "text/markdown" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ATS_Audit_Report_${selectedResumeId}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Audit report downloaded (.md)");
    } catch {
      toast.error("Could not download report.");
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const newMsgs = [...chatMessages, { role: "user", content: textToSend }];
    setChatMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await api.post("/chat/", {
        query: textToSend,
        llm_provider: selectedModel,
        resume_id: selectedResumeId,
      });
      setChatMessages([...newMsgs, { role: "assistant", content: res.data.answer }]);
    } catch (err: any) {
      toast.error("Career Coach response failed.");
      setChatMessages([
        ...newMsgs,
        {
          role: "assistant",
          content: "I ran into an issue connecting to the inference engine. Please retry.",
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedResumeId) {
      toast.error("Please select a resume first.");
      return;
    }
    setGeneratingLetter(true);
    try {
      const res = await api.post("/analysis/cover-letter", {
        resume_id: selectedResumeId,
        context: coverLetterContext || "Software Engineer at a high-growth tech company",
        tone: coverLetterTone,
        provider: selectedModel,
      });
      setGeneratedLetter(res.data.cover_letter);
      toast.success("Cover letter generated!");
    } catch {
      toast.error("Failed to generate cover letter.");
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleGenerateInterviewPrep = async () => {
    if (!selectedResumeId) {
      toast.error("Please select a resume first.");
      return;
    }
    setGeneratingInterview(true);
    try {
      const res = await api.post("/analysis/interview-prep", {
        resume_id: selectedResumeId,
        context: interviewRoleContext || "Senior Full-Stack & System Design Role",
        provider: selectedModel,
      });
      setInterviewData(res.data.interview_prep);
      toast.success("Interview preparation roadmap ready!");
    } catch {
      toast.error("Failed to generate interview questions.");
    } finally {
      setGeneratingInterview(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.info("Signed out.");
    navigate("/login");
  };

  // Radar chart data calculation
  const radarData = scoreData
    ? [
        { subject: "ATS Compliance", score: scoreData.ATS_score || 80, benchmark: 85 },
        { subject: "Readability", score: scoreData.Readability || 75, benchmark: 80 },
        { subject: "Tech Stack", score: scoreData.Technical_Skills || 85, benchmark: 80 },
        { subject: "Action Verbs", score: scoreData.Leadership || 70, benchmark: 75 },
        { subject: "Quantified Impact", score: scoreData.Impact || 65, benchmark: 75 },
        { subject: "Formatting", score: scoreData.Formatting || 85, benchmark: 90 },
      ]
    : [];

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 bg-emerald-950/40 border-emerald-800";
    if (score >= 70) return "text-sky-400 bg-sky-950/40 border-sky-800";
    if (score >= 55) return "text-amber-400 bg-amber-950/40 border-amber-800";
    return "text-rose-400 bg-rose-950/40 border-rose-800";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 88) return "Elite (Top 5%)";
    if (score >= 78) return "Interview Ready";
    if (score >= 65) return "Competitive";
    return "Needs Optimization";
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white antialiased">
      {/* Top Application Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter">
              CP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-sm">CareerPilot</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  v2.1
                </span>
              </div>
            </div>
          </div>

          {/* Active Resume Selector */}
          {resumes.length > 0 && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-800/80">
              <span className="text-xs text-zinc-500 font-mono">DOCUMENT:</span>
              <select
                aria-label="Target Document"
                value={selectedResumeId || ""}
                onChange={(e) => loadResumeDetails(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 px-2.5 py-1 focus:outline-none focus:border-zinc-600 max-w-[220px] truncate"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title || r.filename} {r.ats_score ? `(${r.ats_score} pts)` : ""} {r.is_primary ? "★" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right side status, model, & user profile */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{systemInfo?.active_provider === "smart_local" ? "ChromaDB Ready" : `${systemInfo?.active_provider || "AI"} Ready`}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 h-8 w-8 p-0"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>

          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <span className="text-xs text-zinc-400 hidden sm:inline truncate max-w-[140px] font-mono">
              {userEmail}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-zinc-800 hover:bg-zinc-900 hover:text-red-400 text-zinc-400 text-xs h-8"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Navigation Bar */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950 px-6 py-1.5 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === "audit"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Audit & Diagnostics
          </button>

          <button
            onClick={() => setActiveTab("editor")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === "editor"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
            Resume Studio
          </button>

          <button
            onClick={() => setActiveTab("matcher")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === "matcher"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            Job Matcher
          </button>

          <button
            onClick={() => setActiveTab("tracker")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === "tracker"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
            Applications ({applications.length})
          </button>

          <button
            onClick={() => setActiveTab("coach")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === "coach"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            Career Coach
          </button>

          <button
            onClick={() => setActiveTab("toolkit")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === "toolkit"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Cover Letter & Interview Prep
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === "library"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            Library ({resumes.length})
          </button>
        </div>

        {/* Model switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-zinc-500 font-mono">LLM:</span>
          <select
            aria-label="Inference Provider"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-zinc-700"
          >
            <option value="auto">Auto (Deterministic + LLM)</option>
            <option value="gemini">Google Gemini 2.5</option>
            <option value="openrouter">OpenRouter Nemotron</option>
            <option value="openai">OpenAI GPT-4o</option>
            <option value="groq">Groq Llama 3.3</option>
            <option value="smart_local">Deterministic Neural Engine</option>
          </select>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Empty state when no resumes uploaded */}
        {resumes.length === 0 && (
          <div className="text-center py-20 px-4 space-y-6 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-200 shadow-md">
              <UploadCloud className="w-7 h-7 stroke-[1.5]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white tracking-tight">Upload Your Resume</h2>
              <p className="text-zinc-400 text-xs leading-relaxed">
                CareerPilot parses PDF, DOCX, and TXT resumes, indexes semantic vector embeddings, 
                and evaluates compliance against actual applicant tracking algorithms.
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setSelectedFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border border-dashed rounded-lg p-8 transition-colors ${
                isDragging ? "border-zinc-500 bg-zinc-900/50" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
              }`}
            >
              <Input
                type="file"
                className="hidden"
                id="initial-resume-upload"
                accept=".pdf,.docx,.txt"
                onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
              />
              <Label htmlFor="initial-resume-upload" className="cursor-pointer block space-y-2">
                <FileCheck className="w-5 h-5 text-zinc-500 mx-auto" />
                <span className="text-xs font-semibold text-zinc-200 block">
                  {selectedFile ? selectedFile.name : "Select Document (PDF, DOCX, TXT)"}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono block">or drag and drop</span>
              </Label>
            </div>

            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold h-9 text-xs"
              >
                {uploading ? "Analyzing Document..." : "Parse & Initialize Audit"}
              </Button>
            )}
          </div>
        )}

        {/* WORKSPACE TAB 1: ATS AUDIT & SCORECARD */}
        {resumes.length > 0 && activeTab === "audit" && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold tracking-tight text-white">
                    {activeResumeDetail?.title || activeResumeDetail?.filename || "Resume"}
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    v{activeResumeDetail?.version || 1}
                  </span>
                  {scoreData && (
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getScoreBadgeColor(
                        scoreData.Overall_score
                      )}`}
                    >
                      {getScoreLabel(scoreData.Overall_score)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Readability Index: {scoreData?.readability_details?.flesch_reading_ease || 75} • Word Count:{" "}
                  {scoreData?.word_count || 450} • Quantified Metrics: {scoreData?.metric_count || 4}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                  className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs h-8 hover:bg-zinc-800"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export Report (.md)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("editor")}
                  className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs h-8 hover:bg-zinc-800"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Edit Bullets
                </Button>
                <Button
                  size="sm"
                  onClick={() => selectedResumeId && triggerAnalysis(selectedResumeId, true)}
                  disabled={analyzing}
                  className="bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold text-xs h-8"
                >
                  <RotateCcw className={`w-3.5 h-3.5 mr-1 ${analyzing ? "animate-spin" : ""}`} />
                  {analyzing ? "Auditing..." : "Re-Analyze"}
                </Button>
              </div>
            </div>

            {/* Score Overview: Big Metric Cards + Radar Chart */}
            {scoreData && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Overall Score Dial */}
                <Card className="lg:col-span-4 border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      Overall ATS Readiness
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center text-center py-6 space-y-4">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="7"
                          fill="transparent"
                          className="text-zinc-800"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="7"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - (scoreData.Overall_score || 0) / 100)}
                          strokeLinecap="round"
                          fill="transparent"
                          className={
                            scoreData.Overall_score >= 80
                              ? "text-emerald-500"
                              : scoreData.Overall_score >= 65
                              ? "text-sky-500"
                              : "text-amber-500"
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-white tracking-tight">
                          {scoreData.Overall_score}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">/ 100 PTS</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-zinc-200">{getScoreLabel(scoreData.Overall_score)}</p>
                      <p className="text-[11px] text-zinc-400 max-w-[260px] leading-relaxed">
                        {scoreData.summary_critique ||
                          "Solid overall profile. Elevate measurable metrics to reach the top 5% tier."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card className="lg:col-span-8 border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-0 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-white">Diagnostic Radar</CardTitle>
                      <CardDescription className="text-xs text-zinc-400">
                        Benchmarked against top technical applicant percentiles.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-mono">
                      <span className="flex items-center gap-1.5 text-sky-400">
                        <span className="w-2 h-2 rounded-full bg-sky-500" /> Candidate
                      </span>
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-zinc-600" /> Benchmark (80)
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[260px] pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#3f3f46" tick={{ fontSize: 9 }} />
                        <Radar name="Benchmark" dataKey="benchmark" stroke="#52525b" fill="#52525b" fillOpacity={0.12} />
                        <Radar name="Candidate" dataKey="score" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Single Bullet On-Demand Transformer */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Instant Bullet Transformer (On-Demand)
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Paste any weak bullet point from your resume to generate 3 high-impact, quantified variations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Worked on optimizing database queries and backend APIs..."
                    value={customBulletInput}
                    onChange={(e) => setCustomBulletInput(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-xs text-zinc-200 focus:border-zinc-700 h-9"
                  />
                  <Button
                    onClick={handleRewriteSingleBullet}
                    disabled={rewritingBullet || !customBulletInput.trim()}
                    className="bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold text-xs h-9 px-4 shrink-0"
                  >
                    {rewritingBullet ? "Transforming..." : "Transform"}
                  </Button>
                </div>

                {customRewrites.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    {customRewrites.map((rw, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/80 space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">{rw.style}</span>
                          <p className="text-xs text-zinc-200 leading-relaxed">{rw.rewrite}</p>
                        </div>
                        <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center text-[10px]">
                          <span className="text-zinc-500 italic truncate max-w-[170px]">{rw.rationale}</span>
                          <button
                            onClick={() => copyToClipboard(rw.rewrite, `custom_rw_${i}`)}
                            className="text-zinc-400 hover:text-white"
                          >
                            {copiedId === `custom_rw_${i}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Strengths & Red Flags Breakdown */}
            {scoreData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-zinc-800 bg-zinc-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Key Resume Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scoreData.strengths?.map((str, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Optimization Red Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scoreData.red_flags?.map((flag, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Before & After Interactive Bullet Rewriter */}
            {scoreData && scoreData.bullet_rewrites && scoreData.bullet_rewrites.length > 0 && (
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Impact Bullet Point Enhancer (Before vs. After)
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Transform passive duty descriptions into quantified, business-oriented outcome statements.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scoreData.bullet_rewrites.map((item, idx) => (
                    <div
                      key={idx}
                      className="border border-zinc-800 rounded-lg p-3.5 bg-zinc-950/70 space-y-2.5 hover:border-zinc-700 transition-colors"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/30 border border-rose-900/40">
                            Original (Passive)
                          </span>
                          <p className="text-xs text-zinc-400 pt-1 leading-relaxed">{item.original}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/30 border border-emerald-900/40">
                              Optimized (Quantified)
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(item.improved, `rewrite_${idx}`)}
                              className="text-xs text-zinc-400 hover:text-white h-6 px-2"
                            >
                              {copiedId === `rewrite_${idx}` ? (
                                <Check className="w-3 h-3 text-emerald-400 mr-1" />
                              ) : (
                                <Copy className="w-3 h-3 mr-1" />
                              )}
                              Copy
                            </Button>
                          </div>
                          <p className="text-xs text-zinc-100 font-medium pt-1 leading-relaxed">{item.improved}</p>
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2 flex items-center gap-1.5">
                        <span className="text-zinc-400 font-mono text-[10px]">RATIONALE:</span>
                        <span>{item.reason}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Extracted Skills Categorization */}
            {scoreData && scoreData.skills_breakdown && (
              <Card className="border-zinc-800 bg-zinc-900/40">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white">Extracted Skills Graph</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(scoreData.skills_breakdown).map(([category, skills]) => (
                    <div key={category} className="space-y-1.5">
                      <span className="text-xs font-mono text-zinc-400 uppercase">{category}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* WORKSPACE TAB 2: RESUME STUDIO (EDITOR & LIVE RE-SCORE) */}
        {resumes.length > 0 && activeTab === "editor" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
              <div>
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-sky-400" />
                  Resume Studio & Live Re-Scorer
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Directly edit or fine-tune your resume text. Saving creates a new version, re-indexes vector chunks, and re-computes your ATS score live.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveEditedResume}
                  disabled={savingEditor}
                  className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs h-8"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {savingEditor ? "Re-Scoring & Indexing..." : "Save & Re-Score"}
                </Button>
              </div>
            </div>

            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
                  <span>DOCUMENT TEXT EDITOR:</span>
                  <span>{editedText.split(/\s+/).filter(Boolean).length} WORDS</span>
                </div>
                <textarea
                  aria-label="Document Text Editor"
                  rows={22}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none leading-relaxed"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* WORKSPACE TAB 3: JOB DESCRIPTION MATCHER */}
        {resumes.length > 0 && activeTab === "matcher" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
              <h2 className="text-base font-bold tracking-tight text-white">Job Description Semantic Matcher</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Paste any target Job Description to identify keyword overlap, missing skills, and save target positions directly to your Application Tracker.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Job Description Input */}
              <div className="lg:col-span-6 space-y-4">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="pb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-mono uppercase text-zinc-400">Target Role Info</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMatcherCompany("Stripe");
                          setMatcherTitle("Staff Platform Engineer");
                          setJobDescription(
                            "We are looking for a Staff Platform Engineer with extensive experience in React, TypeScript, Python, FastAPI, and Docker. Responsibilities include building scalable distributed systems, managing Redis clusters, accelerating CI/CD deployment velocity, and optimizing PostgreSQL databases."
                          );
                        }}
                        className="text-[11px] text-sky-400 hover:text-sky-300 h-6 px-2 font-mono"
                      >
                        Sample JD
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Company Name (e.g. Stripe)"
                        value={matcherCompany}
                        onChange={(e) => setMatcherCompany(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs h-8"
                      />
                      <Input
                        placeholder="Job Title (e.g. Staff Engineer)"
                        value={matcherTitle}
                        onChange={(e) => setMatcherTitle(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs h-8"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <textarea
                      aria-label="Job Requirements"
                      rows={12}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste target job posting (requirements, responsibilities, tech stack)..."
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono resize-none leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleJobMatch}
                        disabled={matching || !jobDescription.trim()}
                        className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 font-semibold h-9 text-xs"
                      >
                        {matching ? "Matching..." : "Calculate Keyword Match"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleSaveToTracker}
                        disabled={!jobDescription.trim()}
                        className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs h-9 hover:bg-zinc-800"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                        Save to Tracker
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Match Results */}
              <div className="lg:col-span-6 space-y-4">
                {matchResult ? (
                  <Card className="border-zinc-800 bg-zinc-900/50 space-y-4">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-white">Match Diagnostic</CardTitle>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border font-mono ${
                            matchResult.match_score >= 75
                              ? "text-emerald-400 bg-emerald-950/40 border-emerald-800"
                              : "text-amber-400 bg-amber-950/40 border-amber-800"
                          }`}
                        >
                          {matchResult.fit_level || "Calculated"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-zinc-400">OVERALL KEYWORD MATCH</span>
                          <span className="font-bold text-white text-sm">{matchResult.match_score}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              matchResult.match_score >= 75 ? "bg-emerald-500" : "bg-sky-500"
                            }`}
                            style={{ width: `${matchResult.match_score}%` }}
                          />
                        </div>
                      </div>

                      {/* Matching Skills */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          MATCHING SKILLS ({matchResult.matching_skills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {matchResult.matching_skills?.map((s: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-300 border border-emerald-800/40 font-mono"
                            >
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Missing Skills */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-mono text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          MISSING KEYWORDS ({matchResult.missing_skills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {matchResult.missing_skills?.length > 0 ? (
                            matchResult.missing_skills.map((s: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded bg-rose-950/30 text-rose-300 border border-rose-800/40 font-mono"
                              >
                                ✕ {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-500 font-mono">Zero keyword gaps detected.</span>
                          )}
                        </div>
                      </div>

                      {/* Recommendations */}
                      {matchResult.recommendations && (
                        <div className="space-y-2 border-t border-zinc-800/80 pt-3">
                          <span className="text-xs font-mono text-zinc-300">TAILORING STEPS:</span>
                          <div className="space-y-1.5">
                            {matchResult.recommendations.map((rec: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-zinc-400">
                                <span className="text-zinc-300 font-bold">{idx + 1}.</span>
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-zinc-800 bg-zinc-900/30 flex flex-col items-center justify-center p-12 text-center text-zinc-500">
                    <Briefcase className="w-10 h-10 mb-2 stroke-1 text-zinc-600" />
                    <p className="text-xs font-medium text-zinc-400">Awaiting Target Job Description</p>
                    <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                      Paste the requirements on the left to benchmark your resume against specific ATS keyword filters.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB 4: JOB APPLICATION TRACKER */}
        {resumes.length > 0 && activeTab === "tracker" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
              <div>
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <BookmarkPlus className="w-4 h-4 text-amber-400" />
                  Application Pipeline Tracker
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Track target job applications, monitor your computed match scores, and manage interview progression.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab("matcher")}
                className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add From Matcher
              </Button>
            </div>

            {loadingApps ? (
              <Card className="border-zinc-800 bg-zinc-900/30 p-12 text-center text-zinc-500 font-mono text-xs">
                Loading applications pipeline...
              </Card>
            ) : applications.length === 0 ? (
              <Card className="border-zinc-800 bg-zinc-900/30 p-12 text-center text-zinc-500 space-y-2">
                <BookmarkPlus className="w-10 h-10 mx-auto text-zinc-600 stroke-1" />
                <p className="text-xs text-zinc-400">No applications tracked yet.</p>
                <p className="text-[11px] text-zinc-500">
                  Run a match in the Job Matcher tab and click "Save to Tracker" to add positions here.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applications.map((app) => (
                  <Card key={app.id} className="border-zinc-800 bg-zinc-900/50 space-y-3">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-white">{app.job_title}</p>
                          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {app.company_name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteApp(app.id)}
                          className="text-zinc-500 hover:text-rose-400 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex justify-between items-center text-xs border-t border-zinc-800 pt-2">
                        <span className="text-zinc-500 font-mono text-[11px]">MATCH SCORE:</span>
                        <span
                          className={`font-mono font-bold text-xs ${
                            app.match_score && app.match_score >= 75 ? "text-emerald-400" : "text-sky-400"
                          }`}
                        >
                          {app.match_score ? `${app.match_score}%` : "Pending"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-zinc-500">STATUS:</span>
                        <select
                          aria-label="Application Status"
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                          className="w-full bg-[#09090b] border border-zinc-800 text-xs text-zinc-300 rounded px-2 py-1 font-mono focus:outline-none focus:border-zinc-700"
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE TAB 5: AI CAREER COACH (RAG) */}
        {resumes.length > 0 && activeTab === "coach" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  AI Career Coach (Contextual RAG)
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Semantic retrieval directly from your indexed resume vector store. Grounded strictly in your facts.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setChatMessages([
                    {
                      role: "assistant",
                      content: "Chat cleared. What career strategy or technical interview question shall we tackle?",
                    },
                  ])
                }
                className="border-zinc-800 bg-zinc-900 text-zinc-400 text-xs h-8 hover:bg-zinc-800 hover:text-white"
              >
                Clear History
              </Button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-2">
              {[
                "What are my 3 strongest technical selling points?",
                "Suggest 3 high-impact bullets for my latest role",
                "Simulate a tough behavioral interview question",
                "How can I frame my experience for a Senior/Staff role?",
                "What skills should I learn next based on my gap?",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-[11px] px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  {prompt}
                </button>
              ))}
            </div>

            {/* Chat Box */}
            <Card className="border-zinc-800 bg-zinc-900/40 flex flex-col h-[540px]">
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs font-bold ${
                        msg.role === "user"
                          ? "bg-zinc-100 text-zinc-950"
                          : "bg-zinc-900 text-emerald-400 border border-zinc-800"
                      }`}
                    >
                      {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={`relative group max-w-[85%] rounded-lg p-3.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-[#09090b] border border-zinc-800/80 text-zinc-200"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-xs max-w-none space-y-2">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {msg.role === "assistant" && (
                        <button
                          onClick={() => copyToClipboard(msg.content, `chat_${idx}`)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                          title="Copy Answer"
                        >
                          {copiedId === `chat_${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded bg-zinc-900 text-emerald-400 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce delay-200" />
                      <span className="pl-1 font-mono text-[11px]">Searching vector chunks & synthesizing...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </CardContent>

              <CardFooter className="p-3 border-t border-zinc-800 bg-[#09090b]/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex w-full gap-2"
                >
                  <Input
                    placeholder="Ask CareerPilot about your resume, missing skills, or interview talking points..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 focus:border-zinc-700 h-9"
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold h-9 px-3"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* WORKSPACE TAB 6: CAREER TOOLKIT (COVER LETTER & INTERVIEW PREP) */}
        {resumes.length > 0 && activeTab === "toolkit" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
              <h2 className="text-base font-bold tracking-tight text-white">Executive Career Toolkit</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Generate high-conversion tailored cover letters and role-specific interview preparation roadmaps.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cover Letter Generator */}
              <Card className="border-zinc-800 bg-zinc-900/50 space-y-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Targeted Cover Letter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400 font-mono">TARGET ROLE & COMPANY</Label>
                    <Input
                      placeholder="e.g. Senior Backend Engineer at Stripe"
                      value={coverLetterContext}
                      onChange={(e) => setCoverLetterContext(e.target.value)}
                      className="bg-[#09090b] border-zinc-800 text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400 font-mono">TONE & STYLE</Label>
                    <select
                      aria-label="Tone & Style"
                      value={coverLetterTone}
                      onChange={(e) => setCoverLetterTone(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded text-xs text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
                    >
                      <option value="Confident">Confident & Impactful (Recommended)</option>
                      <option value="Executive">Executive Leadership</option>
                      <option value="Collaborative">Collaborative & Team-Centric</option>
                      <option value="Startup">Fast-Paced Startup</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleGenerateCoverLetter}
                    disabled={generatingLetter}
                    className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs h-8"
                  >
                    {generatingLetter ? "Drafting Cover Letter..." : "Generate Letter"}
                  </Button>

                  {generatedLetter && (
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-mono text-zinc-400">GENERATED DRAFT:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedLetter, "cover_letter")}
                          className="text-xs text-zinc-400 hover:text-white h-6 px-2"
                        >
                          {copiedId === "cover_letter" ? (
                            <Check className="w-3 h-3 mr-1 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                      <textarea
                        aria-label="Generated Draft"
                        rows={10}
                        value={generatedLetter}
                        onChange={(e) => setGeneratedLetter(e.target.value)}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-sans leading-relaxed"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mock Interview Prep */}
              <Card className="border-zinc-800 bg-zinc-900/50 space-y-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Interview Q&A Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400 font-mono">INTERVIEW DOMAIN FOCUS</Label>
                    <Input
                      placeholder="e.g. Distributed Systems & High-Scale Architecture"
                      value={interviewRoleContext}
                      onChange={(e) => setInterviewRoleContext(e.target.value)}
                      className="bg-[#09090b] border-zinc-800 text-xs h-8"
                    />
                  </div>

                  <Button
                    onClick={handleGenerateInterviewPrep}
                    disabled={generatingInterview}
                    className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-xs h-8"
                  >
                    {generatingInterview ? "Synthesizing Questions..." : "Generate Interview Roadmap"}
                  </Button>

                  {interviewData && (
                    <div className="space-y-3 pt-2 border-t border-zinc-800 max-h-[360px] overflow-y-auto pr-1">
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-sky-400 uppercase">Technical Deep Dives:</span>
                        {interviewData.technical_questions?.map((item: any, i: number) => (
                          <div key={i} className="p-2.5 rounded bg-[#09090b] border border-zinc-800 space-y-1">
                            <p className="text-xs font-semibold text-zinc-200">
                              Q{i + 1}: {item.question}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              <span className="text-sky-400 font-mono">Focus:</span> {item.key_focus}
                            </p>
                            {item.sample_talking_point && (
                              <p className="text-[11px] text-zinc-500 italic">
                                Strategy: {item.sample_talking_point}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-emerald-400 uppercase">
                          Behavioral (STAR Method):
                        </span>
                        {interviewData.behavioral_questions?.map((item: any, i: number) => (
                          <div key={i} className="p-2.5 rounded bg-[#09090b] border border-zinc-800 space-y-1">
                            <p className="text-xs font-semibold text-zinc-200">
                              Q{i + 1}: {item.question}
                            </p>
                            {item.sample_talking_point && (
                              <p className="text-[11px] text-zinc-500 italic">
                                Strategy: {item.sample_talking_point}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB 7: RESUME LIBRARY */}
        {resumes.length > 0 && activeTab === "library" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-zinc-900/40 p-4 rounded-lg border border-zinc-800">
              <div>
                <h2 className="text-base font-bold tracking-tight text-white">Document Library</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage multiple resume variations for different role targets.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  className="hidden"
                  id="tab-resume-upload"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <Label
                  htmlFor="tab-resume-upload"
                  className="cursor-pointer inline-flex items-center gap-2 bg-white text-zinc-950 hover:bg-zinc-200 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {selectedFile ? selectedFile.name : "Upload Document"}
                </Label>
                {selectedFile && (
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs h-7"
                  >
                    Confirm
                  </Button>
                )}
              </div>
            </div>

            {/* Resume Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.map((r) => (
                <Card
                  key={r.id}
                  onClick={() => {
                    loadResumeDetails(r.id);
                    setActiveTab("audit");
                  }}
                  className={`cursor-pointer transition-all border ${
                    selectedResumeId === r.id
                      ? "border-zinc-500 bg-zinc-900/80 shadow-md"
                      : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-zinc-300">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate max-w-[170px]">
                          <p className="font-semibold text-xs text-white truncate">{r.title || r.filename}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {new Date(r.created_at).toLocaleDateString()} • v{r.version || 1}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteResume(r.id, e)}
                        className="text-zinc-500 hover:text-rose-400 h-6 w-6 p-0"
                        title="Delete resume"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="flex justify-between items-center text-xs border-t border-zinc-800/80 pt-2">
                      <span className="text-zinc-500 font-mono text-[10px]">ATS SCORE:</span>
                      <span
                        className={`font-mono font-bold text-xs ${
                          r.ats_score && r.ats_score >= 80 ? "text-emerald-400" : "text-sky-400"
                        }`}
                      >
                        {r.ats_score ? `${r.ats_score} / 100` : "Pending"}
                      </span>
                    </div>

                    {r.preview_snippet && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {r.preview_snippet}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span className="text-zinc-400 hover:text-white flex items-center gap-1">
                      Inspect & Audit <ChevronRight className="w-3 h-3" />
                    </span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Raw Parsed Text Modal */}
      {viewTextModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xs text-white">Extracted Document Text</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewTextModal(null)}
                className="text-zinc-400 hover:text-white h-7 text-xs"
              >
                Close
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap select-text">
              {viewTextModal}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
