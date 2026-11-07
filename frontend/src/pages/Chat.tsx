import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Send, Bot, User, ArrowLeft, Sparkles, Copy, Check, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    {
      role: "assistant",
      content:
        "**Welcome to the CareerPilot AI Coach!**\n\nI have full access to your uploaded resume documents via semantic vector search. What career goals or interview preparations are we tackling today?",
    },
  ]);
  const [query, setQuery] = useState("");
  const [llmProvider, setLlmProvider] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const navigate = useNavigate();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchResumes();
    document.documentElement.classList.add("dark");
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get("/resume/");
      setResumes(res.data);
      if (res.data.length > 0) {
        setSelectedResumeId(res.data[0].id);
      }
    } catch {
      // Ignore
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || query;
    if (!textToSend.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    try {
      const res = await api.post("/chat/", {
        query: textToSend,
        llm_provider: llmProvider,
        resume_id: selectedResumeId,
      });
      setMessages([...newMessages, { role: "assistant", content: res.data.answer }]);
    } catch (err: any) {
      toast.error("Failed to get response");
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an issue retrieving data from the inference engine. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs h-9"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-3">
          {resumes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Context:</span>
              <select
                aria-label="Context Resume"
                value={selectedResumeId || ""}
                onChange={(e) => setSelectedResumeId(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded px-2.5 py-1.5"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.filename}
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            aria-label="Model Provider"
            value={llmProvider}
            onChange={(e) => setLlmProvider(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded px-2.5 py-1.5"
          >
            <option value="auto">Auto (Smart Engine)</option>
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter Nemotron</option>
            <option value="openai">OpenAI GPT-4o</option>
            <option value="groq">Groq Llama 3</option>
          </select>
        </div>
      </div>

      {/* Main Chat Box */}
      <Card className="w-full max-w-4xl h-[720px] flex flex-col border-zinc-800 bg-zinc-900/60 shadow-2xl backdrop-blur-sm">
        <CardHeader className="border-b border-zinc-800/80 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              AI Career Coach
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Retrieval-Augmented Generation grounded in your uploaded resume documents.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setMessages([
                {
                  role: "assistant",
                  content: "Chat reset. How can I help you sharpen your career strategy today?",
                },
              ])
            }
            className="text-xs text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </CardHeader>

        {/* Quick prompt chips */}
        <div className="px-4 py-2 border-b border-zinc-800/60 flex flex-wrap gap-1.5 bg-zinc-950/40">
          {[
            "Audit my resume summary",
            "What technical skills am I missing?",
            "Simulate a Staff Engineer behavioral question",
            "How do I explain an employment gap?",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              {prompt}
            </button>
          ))}
        </div>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === "user"
                    ? "bg-sky-500 text-white"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                }`}
              >
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`relative group max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-sky-500/10 border border-sky-500/20 text-zinc-100"
                    : "bg-zinc-900/90 border border-zinc-800 text-zinc-200"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-invert prose-xs max-w-none space-y-2">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}

                {m.role === "assistant" && (
                  <button
                    onClick={() => copyToClipboard(m.content, idx)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                    title="Copy Answer"
                  >
                    {copiedIdx === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-200" />
                <span className="pl-1">Synthesizing personalized career advice...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </CardContent>

        <CardFooter className="p-3 border-t border-zinc-800 bg-zinc-950/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex w-full gap-2"
          >
            <Input
              placeholder="Ask anything about your resume, missing skills, or interview prep..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 focus:border-emerald-500 h-10"
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-10 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
