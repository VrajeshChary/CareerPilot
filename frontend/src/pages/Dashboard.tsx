import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, UploadCloud, MessageSquare, LogOut } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scoreData, setScoreData] = useState<any>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await api.get("/resume/");
      setResumes(res.data);
    } catch (err) {
      toast.error("Failed to fetch resumes");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadResume = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const res = await api.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message);
      setSelectedFile(null);
      fetchResumes();
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const analyzeResume = async (id: number) => {
    try {
      toast.info("Analyzing resume... This might take a moment.");
      const res = await api.get(`/analysis/${id}/score`);
      const parsed = JSON.parse(res.data.score_data);
      setScoreData(parsed);
      toast.success("Analysis complete!");
    } catch (err) {
      toast.error("Analysis failed. Make sure OpenAI API key is set.");
    }
  };

  const chartData = scoreData ? [
    { subject: 'ATS Score', A: scoreData.ATS_score, fullMark: 100 },
    { subject: 'Readability', A: scoreData.Readability, fullMark: 100 },
    { subject: 'Technical', A: scoreData.Technical_Skills, fullMark: 100 },
    { subject: 'Leadership', A: scoreData.Leadership, fullMark: 100 },
    { subject: 'Impact', A: scoreData.Impact, fullMark: 100 },
  ] : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight">CareerPilot Dashboard</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/chat")}>
              <MessageSquare className="w-4 h-4 mr-2" />
              AI Career Coach
            </Button>
            <Button variant="ghost" onClick={() => { localStorage.clear(); navigate("/login"); }}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Upload Resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                <UploadCloud className="w-10 h-10 text-zinc-400 mb-2" />
                <Input type="file" className="hidden" id="resume-upload" onChange={handleUpload} accept=".pdf,.docx,.txt" />
                <Label htmlFor="resume-upload" className="cursor-pointer font-medium text-primary">
                  {selectedFile ? selectedFile.name : "Click to select a file"}
                </Label>
              </div>
              <Button className="w-full" disabled={!selectedFile || uploading} onClick={uploadResume}>
                {uploading ? "Uploading..." : "Upload & Parse"}
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Recent Resumes</CardTitle>
            </CardHeader>
            <CardContent>
              {resumes.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">No resumes uploaded yet.</div>
              ) : (
                <div className="space-y-4">
                  {resumes.map((r: any) => (
                    <div key={r.id} className="flex justify-between items-center p-4 border rounded-lg bg-card hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <FileText className="text-primary w-5 h-5" />
                        <div>
                          <p className="font-medium">{r.filename}</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => analyzeResume(r.id)}>Analyze</Button>
                        <Button variant="default" size="sm" onClick={() => navigate("/chat")}>Ask AI</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {scoreData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resume Score Analysis</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Score" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Score Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">Overall Score</span>
                    <span className="text-2xl font-bold text-primary">{scoreData.Overall_score}/100</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">ATS Compatibility</p>
                      <p className="font-semibold">{scoreData.ATS_score}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Projects</p>
                      <p className="font-semibold">{scoreData.Projects}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Formatting</p>
                      <p className="font-semibold">{scoreData.Formatting}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Grammar</p>
                      <p className="font-semibold">{scoreData.Grammar}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
