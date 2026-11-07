# CareerPilot AI 🚀

An executive, production-ready AI Resume Intelligence and Career Acceleration Platform. CareerPilot AI evaluates resumes against applicant tracking systems (ATS), calculates keyword gaps against target job descriptions, provides interactive Before & After bullet point rewrites, and features a multi-LLM Retrieval-Augmented Generation (RAG) career coach grounded strictly in your verified documents.

---

## ⚡ Core Architecture & Features

- **Document Ingestion & Multi-Format Parsing**:
  - High-performance extraction for **PDF** (`pymupdf`), **DOCX** (`python-docx`), **TXT**, and Markdown.
  - Automated normalization, null byte stripping, and paragraph-preserving text cleaning.
- **Native Semantic Vector RAG Engine**:
  - Powered by native **ChromaDB** with persistent collections partitioned by user and document ID.
  - Sentence-level chunking with boundary overlap for high semantic recall.
  - Sub-millisecond vector similarity querying without external orchestration bloat.
- **Deterministic & LLM-Powered ATS Audit**:
  - **Overall ATS Score (0-100)**: Evaluates quantifiable business metrics, action verb density, structural hierarchy, and readability.
  - **5-Pillar Competency Radar**: Benchmarked against top 5% industry standards (ATS Compatibility, Readability, Tech Stack, Action Verbs, Quantified Impact).
  - **Impact Bullet Rewriter**: Interactive side-by-side cards comparing weak duties with quantified, metric-driven accomplishments (e.g. Google XYZ formula).
- **Target Job Description Semantic Matcher**:
  - Paste any target job description. Computes keyword overlap, categorized matched vs. missing skills, and tailored resume optimization roadmaps.
- **Multi-LLM Inference with Smart Fallback**:
  - Native integration with **Google Gemini** (`gemini-2.5-flash`), **OpenRouter** (`meta-llama/llama-3.3-70b-instruct`), **OpenAI** (`gpt-4o-mini`), and **Groq**.
  - Built-in **Deterministic Neural Analyzer Fallback**: Runs 100% offline out-of-the-box even if no external API keys are configured.
- **Executive Career Toolkit**:
  - **Tailored Cover Letter Generator**: Custom tone selector (Executive, Confident, Startup, Collaborative) with 1-click clipboard copy.
  - **Mock Interview Simulator**: Tailored Technical deep-dives, Behavioral questions (STAR methodology), and System Design scenarios.
- **Modern "Zero-Slop" UI / UX**:
  - Built with React 19, Vite, TailwindCSS, and Shadcn UI components.
  - Slate and zinc dark/light palette with high contrast and legible typography.
  - Active resume switcher, preview raw text modal, and responsive mobile-first layout.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS v4, Recharts, React Markdown, Lucide Icons, Sonner Toaster, Axios.
- **Backend**: FastAPI, SQLAlchemy, Pydantic v2, PyMuPDF, Python-Docx, PyJWT, Bcrypt.
- **AI & Vectors**: ChromaDB (Local Persistent Client), Google GenAI SDK, OpenAI SDK.
- **Containerization**: Docker, Docker Compose.

---

## 🚀 Quickstart & Local Setup

### 1. Backend Setup

```bash
cd backend

# (Optional) Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API will run at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### 2. Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Run development server
npm run dev
```

Frontend will run at `http://localhost:5173`.

### 3. Running End-to-End Tests

```bash
cd backend
python tests/test_e2e.py
```

---

## 🔒 Security & Best Practices

- Secure passlib/bcrypt password hashing without legacy deprecations.
- Timezone-aware UTC JWT expiration tokens.
- Strict user-isolated vector collections (`user_{user_id}_resumes`) preventing data crosstalk.
- Clean cascade deletion removing files from disk, SQL records, and ChromaDB vector collections.

---

## 📄 License

MIT License.
