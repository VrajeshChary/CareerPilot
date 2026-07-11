import React, { useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Send, Bot, User, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Chat() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: "assistant", content: "Hi! I'm CareerPilot AI. Ask me anything about your resume, missing skills, or interview prep!" }
  ]);
  const [query, setQuery] = useState("");
  const [llmProvider, setLlmProvider] = useState("openai");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const newMessages = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    try {
      const res = await api.post("/chat/", { query, llm_provider: llmProvider });
      setMessages([...newMessages, { role: "assistant", content: res.data.answer }]);
    } catch (err) {
      toast.error("Failed to get response");
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">AI Model:</span>
          <Select value={llmProvider} onValueChange={setLlmProvider}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select LLM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
              <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              <SelectItem value="gemini">Google (Gemini 1.5)</SelectItem>
              <SelectItem value="groq">Groq (Llama 3)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="w-full max-w-4xl h-[700px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle>AI Career Coach</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-xl ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} whitespace-pre-wrap`}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-xl bg-muted flex items-center gap-2">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="flex w-full gap-2">
            <Input 
              placeholder="Ask how to improve your resume..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={loading || !query.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
