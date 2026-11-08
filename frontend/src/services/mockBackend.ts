// CareerPilot In-Browser Mock & Sandbox Engine
// Provides full offline interactive capabilities when remote backend is not connected

export interface MockUser {
  id: number;
  email: string;
}

const STORAGE_KEYS = {
  MODE: "careerpilot_mode", // 'live' | 'offline'
  API_URL: "careerpilot_api_url",
  RESUMES: "careerpilot_mock_resumes",
  APPLICATIONS: "careerpilot_mock_applications",
  USER: "careerpilot_mock_user",
};

const DEFAULT_RESUME_TEXT = `Alex Chen
San Francisco, CA | alex.chen@example.com | (555) 234-5678 | linkedin.com/in/alexchen-infra | github.com/alexchen

SUMMARY
Staff Infrastructure Engineer with 8+ years architecting globally distributed, low-latency cloud infrastructure and high-throughput microservices. Proven track record reducing cloud compute costs by 38% while scaling Kubernetes clusters to handle 2.4M requests per minute at 99.995% SLA.

EXPERIENCE
Staff Infrastructure Engineer | CloudScale Inc.
2023 - Present | San Francisco, CA
- Architected multi-region Kubernetes cluster deployment across AWS us-east-1 and eu-central-1, reducing p99 API latency from 240ms to 42ms.
- Spearheaded company-wide cloud migration optimizing Amazon EKS workloads and Karpenter autoscaling, decreasing monthly AWS expenditure by $145,000 (38% reduction).
- Engineered automated Canary CI/CD deployment pipelines using ArgoCD and GitHub Actions, boosting team deployment frequency by 400% with zero customer downtime.
- Mentored a distributed team of 12 senior and mid-level platform engineers on cloud-native resilience, circuit breakers, and distributed tracing.

Senior Distributed Systems Engineer | StreamFlow Systems
2020 - 2023 | Seattle, WA
- Designed high-throughput real-time stream ingestion engine utilizing Apache Kafka and Golang, processing 18 billion daily financial transactions with sub-10ms delivery guarantees.
- Implemented Redis clustering and distributed caching layers, eliminating 65% of database read bottlenecks during peak Black Friday spikes.
- Led migration from monolithic PostgreSQL database to partitioned distributed database instances, improving queries throughput by 320%.
- Designed automated disaster recovery failover automation reducing RTO from 45 minutes to 38 seconds.

Software Engineer | Apex Tech Solutions
2018 - 2020 | Austin, TX
- Developed RESTful microservices using Python FastAPI and PostgreSQL supporting 500,000 active daily SaaS enterprise users.
- Authored 140+ unit and integration tests with PyTest achieving 94% test code coverage across core billing engines.
- Automated Docker container provisioning and monitoring telemetry using Prometheus and Grafana dashboards.

TECHNICAL SKILLS
- Languages: Python, Go, TypeScript, Rust, SQL, Bash
- Cloud & Infrastructure: AWS, Google Cloud, Docker, Kubernetes, Terraform, Helm, ArgoCD
- Data & Storage: PostgreSQL, Redis, Apache Kafka, Elasticsearch, SQLite, ChromaDB
- Architecture: Distributed Systems, Microservices, Event-Driven Architecture, High Availability, Disaster Recovery

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley | 2014 - 2018
GPA: 3.8 / 4.0 | Dean's Honor Roll`;

const DEFAULT_SCORE_DATA = {
  Overall_score: 91,
  ATS_score: 94,
  Readability: 88,
  Technical_Skills: 96,
  Leadership: 86,
  Impact: 92,
  Formatting: 94,
  Grammar: 98,
  word_count: 420,
  metric_count: 18,
  action_verb_count: 26,
  readability_details: {
    flesch_reading_ease: 64.5,
    avg_words_per_sentence: 14.8,
    estimated_reading_time_min: 2.1,
    frequent_repetitions: ["distributed", "infrastructure", "kubernetes", "cloud", "engineered"],
  },
  skills_breakdown: {
    Cloud: ["AWS", "Docker", "Kubernetes", "Terraform", "Helm", "ArgoCD", "Google Cloud"],
    Backend: ["Python", "FastAPI", "Go", "PostgreSQL", "Redis", "Kafka", "Elasticsearch"],
    Architecture: ["Distributed Systems", "Microservices", "Event-Driven", "High Availability"],
  },
  all_skills: [
    "AWS", "Docker", "Kubernetes", "Terraform", "Helm", "ArgoCD", "Python", "FastAPI", "Go", "PostgreSQL", "Redis", "Kafka", "Elasticsearch", "Distributed Systems", "Microservices"
  ],
  bullet_rewrites: [
    {
      original: "Developed RESTful microservices using Python FastAPI and PostgreSQL supporting 500,000 active daily SaaS enterprise users.",
      improved: "Engineered 12 mission-critical Python FastAPI microservices, scaling PostgreSQL query throughput to support 500k+ daily enterprise users with 99.99% uptime.",
      reason: "Specifies scope of services and highlights high-availability reliability metrics."
    },
    {
      original: "Automated Docker container provisioning and monitoring telemetry using Prometheus and Grafana dashboards.",
      improved: "Orchestrated zero-touch Docker container provisioning and unified Prometheus/Grafana telemetry, cutting incident MTTR by 45%.",
      reason: "Transforms passive task into an active achievement with quantifiable MTTR reduction."
    },
    {
      original: "Mentored a distributed team of 12 senior and mid-level platform engineers on cloud-native resilience, circuit breakers, and distributed tracing.",
      improved: "Spearheaded technical leadership for 12 platform engineers, driving architectural standards for circuit breakers and distributed tracing that eliminated systemic cascading outages.",
      reason: "Frames mentorship around business and architectural resilience impact."
    }
  ],
  red_flags: [
    "Ensure all acronyms like 'SLA' and 'RPO' are spelled out on first reference for HR non-technical screens.",
    "No explicit mention of public technical writing, RFC authorships, or OSS contributions in the summary."
  ],
  strengths: [
    "Exceptional quantification of business metrics, cost savings, and throughput numbers throughout all roles.",
    "Strong high-density alignment with high-demand cloud and distributed systems architecture keywords.",
    "Clean structural layout that parses seamlessly with all tier-1 enterprise ATS engines."
  ],
  summary_critique: "High caliber engineering profile with strong systemic impact. Keywords align closely with Staff/Lead level engineering requirements."
};

const DEFAULT_APPLICATIONS = [
  {
    id: 1,
    company_name: "Stripe",
    job_title: "Staff Infrastructure Engineer",
    job_description: "Scale distributed transaction infrastructure with 99.999% reliability. Looking for deep experience with Kubernetes, Go, Kafka, and multi-region AWS deployments.",
    match_score: 94,
    status: "Interviewing",
    notes: "Passed system design round with the Principal Architect. Next is culture alignment.",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 2,
    company_name: "Datadog",
    job_title: "Senior Distributed Systems Engineer",
    job_description: "Build high-throughput telemetry pipelines. Kafka, distributed storage, p99 latency optimization, Go/Rust.",
    match_score: 91,
    status: "Offer",
    notes: "Received initial offer package. Reviewing equity terms.",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 3,
    company_name: "Linear",
    job_title: "Founding Platform Engineer",
    job_description: "Build fast, sync-first developer tools. Microservices, TypeScript, cloud architecture.",
    match_score: 88,
    status: "Applied",
    notes: "Application submitted via referral.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 4,
    company_name: "Figma",
    job_title: "Cloud Infrastructure Architect",
    job_description: "Multi-region cloud compute architecture, Terraform, Kubernetes, high availability.",
    match_score: 85,
    status: "Saved",
    notes: "Drafting tailored cover letter focusing on multi-region AWS experience.",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export function isMockModeActive(): boolean {
  if (typeof window === "undefined") return false;
  const mode = localStorage.getItem(STORAGE_KEYS.MODE);
  if (mode === "offline") return true;
  if (mode === "live") return false;
  
  // If hosted on Vercel/external domain without a custom VITE_API_URL or saved API URL,
  // default to mock mode to guarantee 100% interactive functionality out-of-the-box!
  const hasCustomUrl = !!localStorage.getItem(STORAGE_KEYS.API_URL) || !!import.meta.env.VITE_API_URL;
  const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  
  if (!hasCustomUrl && !isLocalHost) {
    return true;
  }
  return false;
}

export function setMockMode(active: boolean) {
  localStorage.setItem(STORAGE_KEYS.MODE, active ? "offline" : "live");
}

export function getCustomApiUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8000";
  return (
    localStorage.getItem(STORAGE_KEYS.API_URL) ||
    import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost" ? "http://localhost:8000" : "")
  );
}

export function setCustomApiUrl(url: string) {
  if (url.trim()) {
    localStorage.setItem(STORAGE_KEYS.API_URL, url.trim().replace(/\/$/, ""));
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_URL);
  }
}

// Storage helpers
function getStoredResumes() {
  const data = localStorage.getItem(STORAGE_KEYS.RESUMES);
  if (!data) {
    const initial = [
      {
        id: 1,
        filename: "Alex_Chen_Staff_Engineer_Resume.pdf",
        title: "Alex Chen — Staff Infrastructure Engineer",
        file_size: 48210,
        ats_score: 91,
        is_primary: true,
        version: 1,
        has_analysis: true,
        preview_snippet: "Staff Infrastructure Engineer with 8+ years architecting distributed systems...",
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        parsed_text: DEFAULT_RESUME_TEXT,
        analysis_data: JSON.stringify(DEFAULT_SCORE_DATA),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.RESUMES, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredResumes(resumes: any[]) {
  localStorage.setItem(STORAGE_KEYS.RESUMES, JSON.stringify(resumes));
}

function getStoredApplications() {
  const data = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(DEFAULT_APPLICATIONS));
    return DEFAULT_APPLICATIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveStoredApplications(apps: any[]) {
  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
}

// Client-side Deterministic Scoring
export function evaluateResumeClient(text: string = ""): any {
  const words = text.match(/\b\w+\b/g) || [];
  const wordCount = words.length;
  const lower = text.toLowerCase();

  const actionVerbs = [
    "architected", "engineered", "spearheaded", "orchestrated", "implemented",
    "deployed", "scaled", "optimized", "designed", "reduced", "increased",
    "mentored", "delivered", "authored", "accelerated", "built", "managed"
  ];
  let actionVerbCount = 0;
  actionVerbs.forEach((v) => {
    const matches = lower.match(new RegExp(`\\b${v}\\b`, "g"));
    if (matches) actionVerbCount += matches.length;
  });

  const metrics = text.match(/\b\d+(?:%|\+|(?:x|k|m|b)\b|\.\d+)?|\$\d+/gi) || [];
  const metricCount = metrics.length;

  const techDictionary: Record<string, string[]> = {
    Cloud: ["aws", "gcp", "azure", "docker", "kubernetes", "terraform", "helm", "argocd", "linux"],
    Languages: ["python", "go", "typescript", "javascript", "rust", "c++", "sql", "bash"],
    Frameworks: ["fastapi", "react", "next.js", "node.js", "django", "express"],
    Databases: ["postgresql", "redis", "kafka", "elasticsearch", "mongodb", "sqlite", "chromadb"],
    Systems: ["distributed systems", "microservices", "event-driven", "ci/cd", "rest", "graphql"]
  };

  const detectedSkills: Record<string, string[]> = {};
  const allSkills: string[] = [];

  Object.entries(techDictionary).forEach(([cat, list]) => {
    const found: string[] = [];
    list.forEach((kw) => {
      if (new RegExp(`\\b${kw}\\b`, "i").test(text)) {
        found.push(kw.toUpperCase());
        allSkills.push(kw.toUpperCase());
      }
    });
    if (found.length) detectedSkills[cat] = found;
  });

  const atsScore = Math.min(96, Math.max(50, 60 + actionVerbCount * 2 + metricCount * 2 + (allSkills.length > 5 ? 10 : 0)));
  const formatting = wordCount >= 300 && wordCount <= 900 ? 92 : 75;
  const impact = Math.min(95, Math.max(55, 55 + metricCount * 3));
  const techScore = Math.min(98, Math.max(60, 60 + allSkills.length * 3));
  const readability = wordCount > 150 ? 86 : 60;
  const overall = Math.round((atsScore * 0.35) + (impact * 0.25) + (techScore * 0.25) + (readability * 0.15));

  return {
    Overall_score: overall,
    ATS_score: atsScore,
    Readability: readability,
    Technical_Skills: techScore,
    Leadership: 85,
    Impact: impact,
    Formatting: formatting,
    Grammar: 95,
    word_count: wordCount,
    metric_count: metricCount,
    action_verb_count: actionVerbCount,
    readability_details: {
      flesch_reading_ease: 65,
      avg_words_per_sentence: 14.5,
      estimated_reading_time_min: Math.max(1, +(wordCount / 200).toFixed(1)),
      frequent_repetitions: ["systems", "infrastructure", "engineered", "scaled"],
    },
    skills_breakdown: detectedSkills,
    all_skills: allSkills,
    bullet_rewrites: [
      {
        original: "Automated provisioning and monitoring telemetry using dashboards.",
        improved: "Orchestrated zero-touch cloud provisioning and unified Grafana/Prometheus telemetry, reducing MTTR by 45%.",
        reason: "Adds hard quantification and specific industry tooling."
      },
      {
        original: "Developed microservices supporting active users.",
        improved: "Engineered scalable microservices handling 500k+ daily enterprise requests with 99.99% availability.",
        reason: "Replaces weak phrasing with high-impact scalability metrics."
      }
    ],
    red_flags: [
      "Ensure all abbreviations are spelled out on first reference for non-technical screening algorithms."
    ],
    strengths: [
      "Dense technical keyword presence and strong modern cloud architecture skills.",
      "Clear active phrasing and quantifiable accomplishments."
    ],
    summary_critique: `Strong competitive profile demonstrating quantifiable results across ${allSkills.length} verified technical competencies.`
  };
}

// Router interceptor for mock backend
export async function handleMockRequest(url: string, method: string, data?: any, params?: any): Promise<any> {
  const cleanUrl = url.replace(/^\/api\/v1/, "");

  // 1. Auth endpoints
  if (cleanUrl === "/auth/register" || cleanUrl === "/auth/login") {
    return {
      access_token: "mock-jwt-token-offline-mode-" + Date.now(),
      token_type: "bearer",
      user: {
        id: 1,
        email: data?.email || (typeof data?.get === "function" ? data.get("username") : "candidate@careerpilot.ai"),
      },
    };
  }

  // 2. System Status
  if (cleanUrl === "/system/status") {
    return {
      active_provider: "Smart Client Sandbox",
      has_gemini: false,
      has_openrouter: false,
      has_openai: false,
      has_groq: false,
      vector_db: "ChromaDB (In-Browser RAG Vector Simulator)",
      status: "ready",
      mode: "sandbox",
    };
  }

  // 3. Resumes list
  if (cleanUrl === "/resume/" && method === "get") {
    const resumes = getStoredResumes();
    return resumes.map((r: any) => ({
      id: r.id,
      filename: r.filename,
      title: r.title,
      file_size: r.file_size,
      ats_score: r.ats_score,
      is_primary: r.is_primary,
      version: r.version,
      has_analysis: !!r.analysis_data,
      preview_snippet: r.preview_snippet,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  // 4. Resume detail
  const resumeDetailMatch = cleanUrl.match(/^\/resume\/(\d+)$/);
  if (resumeDetailMatch && method === "get") {
    const id = parseInt(resumeDetailMatch[1]);
    const resumes = getStoredResumes();
    const found = resumes.find((r: any) => r.id === id);
    if (!found) throw { response: { status: 404, data: { detail: "Resume not found" } } };
    return found;
  }

  // 5. Update resume raw text
  if (resumeDetailMatch && method === "put") {
    const id = parseInt(resumeDetailMatch[1]);
    const resumes = getStoredResumes();
    const idx = resumes.findIndex((r: any) => r.id === id);
    if (idx === -1) throw { response: { status: 404, data: { detail: "Resume not found" } } };
    
    resumes[idx].parsed_text = data.raw_text;
    resumes[idx].updated_at = new Date().toISOString();
    if (data.rerun_analysis) {
      const newScore = evaluateResumeClient(data.raw_text);
      resumes[idx].ats_score = newScore.Overall_score;
      resumes[idx].analysis_data = JSON.stringify(newScore);
    }
    saveStoredResumes(resumes);
    return { message: "Resume updated successfully", resume: resumes[idx] };
  }

  // 6. Delete resume
  if (resumeDetailMatch && method === "delete") {
    const id = parseInt(resumeDetailMatch[1]);
    let resumes = getStoredResumes();
    resumes = resumes.filter((r: any) => r.id !== id);
    saveStoredResumes(resumes);
    return { message: "Resume deleted" };
  }

  // 7. Upload resume
  if (cleanUrl === "/resume/upload" && method === "post") {
    const resumes = getStoredResumes();
    const newId = Date.now();
    let uploadName = "Uploaded_Candidate_Resume.pdf";
    let uploadSize = 45000;
    let sampleText = DEFAULT_RESUME_TEXT;

    if (data && typeof data.get === "function") {
      const file = data.get("file");
      if (file && typeof file === "object") {
        uploadName = file.name || uploadName;
        uploadSize = file.size || uploadSize;
        if (typeof file.text === "function") {
          try {
            const extracted = await file.text();
            if (extracted && extracted.trim().length > 40) {
              sampleText = extracted;
            }
          } catch {
            // Keep default fallback
          }
        }
      }
    }

    const score = evaluateResumeClient(sampleText);
    
    const newResume = {
      id: newId,
      filename: uploadName,
      title: uploadName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      file_size: uploadSize,
      ats_score: score.Overall_score,
      is_primary: resumes.length === 0,
      version: 1,
      has_analysis: true,
      preview_snippet: sampleText.substring(0, 120) + "...",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parsed_text: sampleText,
      analysis_data: JSON.stringify(score),
    };
    resumes.unshift(newResume);
    saveStoredResumes(resumes);
    return {
      message: "Resume indexed and analyzed successfully",
      resume_id: newId,
      filename: newResume.filename,
      ats_score: newResume.ats_score,
    };
  }

  // 8. Analyze resume
  const scoreMatch = cleanUrl.match(/^\/analysis\/(\d+)\/score/);
  if (scoreMatch && method === "get") {
    const id = parseInt(scoreMatch[1]);
    const resumes = getStoredResumes();
    const found = resumes.find((r: any) => r.id === id);
    if (!found) throw { response: { status: 404, data: { detail: "Resume not found" } } };
    
    let scoreData;
    if (found.analysis_data && !params?.refresh) {
      scoreData = JSON.parse(found.analysis_data);
    } else {
      scoreData = evaluateResumeClient(found.parsed_text || DEFAULT_RESUME_TEXT);
      found.ats_score = scoreData.Overall_score;
      found.analysis_data = JSON.stringify(scoreData);
      saveStoredResumes(resumes);
    }
    return { score_data: scoreData, source: "Smart Client Engine" };
  }

  // 9. Rewrite single bullet
  if (cleanUrl === "/analysis/rewrite-bullet" && method === "post") {
    const bullet = data?.bullet || "";
    return {
      source: "Smart Client Engine",
      rewrites: [
        {
          style: "Quantified Metric",
          rewrite: `Architected and optimized ${bullet.replace(/^[-\s•*]+/, "")}, generating a 42% latency reduction and saving $85,000 annually.`,
          rationale: "Embeds hard percentage improvements and financial cost savings."
        },
        {
          style: "Executive Leadership",
          rewrite: `Spearheaded cross-functional technical strategy for ${bullet.replace(/^[-\s•*]+/, "")}, aligning 14 platform engineers with enterprise scalability goals.`,
          rationale: "Frames contribution around strategic scope, mentorship, and high-level delivery."
        },
        {
          style: "Action & Tooling",
          rewrite: `Engineered high-throughput automation pipelines using Docker, Kubernetes, and Go to execute ${bullet.replace(/^[-\s•*]+/, "")} with zero downtime.`,
          rationale: "Highlights specific industry-standard tooling and high reliability standards."
        }
      ]
    };
  }

  // 10. Job Matcher
  if (cleanUrl === "/analysis/match" && method === "post") {
    const resumes = getStoredResumes();
    const resume = resumes.find((r: any) => r.id === data.resume_id) || resumes[0];
    const resumeText = (resume?.parsed_text || "").toLowerCase();
    const jdText = (data.job_description || "").toLowerCase();

    const techTokens = [
      "kubernetes", "docker", "aws", "gcp", "python", "go", "typescript", "react",
      "kafka", "redis", "postgresql", "terraform", "ci/cd", "microservices", "distributed"
    ];

    const matching: string[] = [];
    const missing: string[] = [];

    techTokens.forEach((t) => {
      if (jdText.includes(t)) {
        if (resumeText.includes(t)) {
          matching.push(t.toUpperCase());
        } else {
          missing.push(t.toUpperCase());
        }
      }
    });

    const matchScore = matching.length > 0
      ? Math.min(95, Math.max(68, Math.round((matching.length / (matching.length + missing.length || 1)) * 100)))
      : 84;

    return {
      match_score: matchScore,
      job_match_score: matchScore,
      matching_keywords: matching.length ? matching : ["AWS", "KUBERNETES", "PYTHON", "DOCKER"],
      missing_keywords: missing.length ? missing : ["GRAPHQL", "TERRAFORM CLOUD"],
      gap_analysis: [
        `Target role heavily emphasizes ${missing.slice(0, 2).join(" & ") || "system observability"} which is not explicitly mentioned in the resume.`,
        "Strong semantic alignment with core backend and distributed infrastructure requirements.",
      ],
      strengths: [
        "Proven multi-region distributed systems background matches role requirements.",
        "Clear quantifiable achievements in compute cost optimization and latency reduction.",
      ],
    };
  }

  // 11. Applications CRUD
  if (cleanUrl === "/applications/" && method === "get") {
    return getStoredApplications();
  }

  if (cleanUrl === "/applications/" && method === "post") {
    const apps = getStoredApplications();
    const newApp = {
      id: Date.now(),
      company_name: data.company_name || "Company",
      job_title: data.job_title || "Software Engineer",
      job_description: data.job_description || "",
      match_score: data.match_score || 85,
      status: data.status || "Saved",
      notes: data.notes || "",
      created_at: new Date().toISOString(),
    };
    apps.unshift(newApp);
    saveStoredApplications(apps);
    return newApp;
  }

  const appDetailMatch = cleanUrl.match(/^\/applications\/(\d+)$/);
  if (appDetailMatch && method === "put") {
    const id = parseInt(appDetailMatch[1]);
    const apps = getStoredApplications();
    const idx = apps.findIndex((a: any) => a.id === id);
    if (idx !== -1) {
      apps[idx] = { ...apps[idx], ...data };
      saveStoredApplications(apps);
      return apps[idx];
    }
  }

  if (appDetailMatch && method === "delete") {
    const id = parseInt(appDetailMatch[1]);
    let apps = getStoredApplications();
    apps = apps.filter((a: any) => a.id !== id);
    saveStoredApplications(apps);
    return { message: "Application removed" };
  }

  // 12. Chat with RAG
  if (cleanUrl === "/chat/" && method === "post") {
    const query = (data?.query || "").toLowerCase();
    let responseText = "";

    if (query.includes("interview") || query.includes("question")) {
      responseText = `### 🎯 Simulated Technical Interview Question\n\n**Question:** *\"Can you walk me through an architectural trade-off you made when designing the multi-region Kubernetes deployment mentioned in your experience?\"*\n\n**Recommended STAR Response Outline:**\n- **Situation:** CloudScale required 99.995% availability across US and EU regions.\n- **Task:** Prevent split-brain consistency issues while optimizing cross-region latency.\n- **Action:** Implemented Karpenter autoscaling with asynchronous Kafka event replication across regions.\n- **Result:** Decreased p99 latency to 42ms and saved $145k/month.`;
    } else if (query.includes("rewrite") || query.includes("bullet") || query.includes("improve")) {
      responseText = `### ⚡ Bullet Point Audit & Rewrite\n\n**Original:** *\"Spearheaded company-wide cloud migration optimizing Amazon EKS workloads.\"*\n\n**High-Impact Revision:**\n> *\"Architected enterprise-wide AWS EKS migration with Karpenter dynamic scaling, cutting annual infrastructure spend by $145,000 while maintaining 99.995% uptime across 2.4M requests/min.\"*\n\n**Key Strengths:** Added exact financial quantification, reliability metrics, and system throughput.`;
    } else {
      responseText = `Based on your indexed resume vectors, your strongest competitive differentiator is your **quantifiable distributed systems impact** (scaling to 2.4M req/min, 42ms p99 latency, and $145k in monthly compute savings).\n\nWhen speaking with hiring managers, emphasize:\n1. **Financial Stewardship:** Translating technical architecture directly into business margin.\n2. **Reliability at Scale:** Experience managing multi-region Kubernetes clusters with zero customer downtime.`;
    }

    return {
      answer: responseText,
      response: responseText,
      sources: [{ filename: "Alex_Chen_Staff_Engineer_Resume.pdf", score: 0.94 }],
      provider: "Smart Client Sandbox",
    };
  }

  // 13. Cover letter generator
  if (cleanUrl === "/analysis/generate-cover-letter" && method === "post") {
    return {
      cover_letter: `Dear Hiring Team,\n\nI am writing to express my strong enthusiasm for the engineering leadership opportunity at your organization. With over eight years architecting resilient, multi-region distributed cloud infrastructure and scaling Kubernetes platforms to millions of daily requests, I have consistently aligned technical excellence with measurable business outcomes.\n\nAt CloudScale Inc., I spearheaded our multi-region Kubernetes and AWS EKS migration, which reduced p99 latency from 240ms to 42ms while lowering cloud expenditures by $145,000 monthly. Prior to that at StreamFlow Systems, I designed Kafka-driven stream ingestion handling 18 billion daily financial transactions.\n\nI look forward to discussing how my experience in cloud infrastructure, scalability, and technical team mentorship can accelerate your roadmap.\n\nSincerely,\nAlex Chen`,
      provider: "Smart Client Sandbox",
    };
  }

  // 14. Interview prep
  if (cleanUrl === "/analysis/interview-prep" && method === "post") {
    return {
      prep: `### 🎯 Tailored Technical & Behavioral Interview Guide\n\n#### 1. System Design: Cross-Region Consistency\n- **Prompt:** How would you handle state synchronization across AWS us-east-1 and eu-central-1 under network partitions?\n- **Key Talking Points:** Discuss active-active vs. active-passive topologies, Kafka topic mirroring, and eventual consistency trade-offs.\n\n#### 2. Leadership & Mentorship\n- **Prompt:** Describe how you brought 12 engineers up to speed on distributed tracing.\n- **Key Talking Points:** Reference telemetry standardization, OpenTelemetry adoption, and reducing incident MTTR by 45%.\n\n#### 3. Behavioral: Cost vs. Performance\n- **Prompt:** How do you justify infrastructure investments to executive leadership?\n- **Key Talking Points:** Reference saving $145k/month through Karpenter and right-sizing workloads without compromising latency SLAs.`,
      provider: "Smart Client Sandbox",
    };
  }

  // Fallback
  return { status: "ok" };
}
