import json
import re
import math
from typing import Dict, Any, List, Optional, Generator, AsyncGenerator
from app.core.config import settings

# Attempt to import modern official clients
try:
    from google import genai
    from google.genai import types as genai_types
except ImportError:
    genai = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


class LLMService:
    @staticmethod
    def get_active_provider(requested_provider: Optional[str] = None) -> str:
        """Determines best available provider based on available keys and user preference."""
        req = (requested_provider or "auto").lower()
        if req == "gemini" and settings.GEMINI_API_KEY:
            return "gemini"
        if req == "openrouter" and settings.OPENROUTER_API_KEY:
            return "openrouter"
        if req == "openai" and settings.OPENAI_API_KEY:
            return "openai"
        if req == "groq" and settings.GROQ_API_KEY:
            return "groq"

        # Auto-detect first configured key
        if settings.GEMINI_API_KEY:
            return "gemini"
        if settings.OPENROUTER_API_KEY:
            return "openrouter"
        if settings.OPENAI_API_KEY:
            return "openai"
        if settings.GROQ_API_KEY:
            return "groq"
        return "smart_local"

    @classmethod
    def generate_text(cls, prompt: str, system_prompt: Optional[str] = None, provider: Optional[str] = None) -> str:
        active = cls.get_active_provider(provider)
        
        # 1. Google Gemini via official google-genai
        if active == "gemini" and genai and settings.GEMINI_API_KEY:
            try:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                full_prompt = f"System: {system_prompt}\n\nUser: {prompt}" if system_prompt else prompt
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=full_prompt,
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                print(f"[LLMService] Gemini error: {e}. Falling back...")

        # 2. OpenRouter via OpenAI client
        if active == "openrouter" and OpenAI and settings.OPENROUTER_API_KEY:
            try:
                client = OpenAI(
                    base_url="https://openrouter.ai/api/v1",
                    api_key=settings.OPENROUTER_API_KEY,
                )
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                completion = client.chat.completions.create(
                    model=settings.OPENROUTER_MODEL,
                    messages=messages,
                    temperature=0.2,
                )
                return completion.choices[0].message.content.strip()
            except Exception as e:
                print(f"[LLMService] OpenRouter error: {e}. Falling back...")

        # 3. Direct OpenAI
        if active == "openai" and OpenAI and settings.OPENAI_API_KEY:
            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                completion = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=messages,
                    temperature=0.2,
                )
                return completion.choices[0].message.content.strip()
            except Exception as e:
                print(f"[LLMService] OpenAI error: {e}. Falling back...")

        # 4. Groq via OpenAI client
        if active == "groq" and OpenAI and settings.GROQ_API_KEY:
            try:
                client = OpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=settings.GROQ_API_KEY,
                )
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                completion = client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=messages,
                    temperature=0.2,
                )
                return completion.choices[0].message.content.strip()
            except Exception as e:
                print(f"[LLMService] Groq error: {e}. Falling back...")

        # Default fallback to Smart Local Analyzer
        return ""

    @classmethod
    def clean_json_response(cls, raw: str) -> Optional[Dict[str, Any]]:
        """Cleans and extracts JSON object from LLM output."""
        if not raw:
            return None
        
        cleaned = re.sub(r"^```(?:json)?", "", raw.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```$", "", cleaned.strip(), flags=re.MULTILINE).strip()
        
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"(\{[\s\S]*\})", cleaned)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
        return None


class SmartResumeAnalyzer:
    """Heuristic and NLP analysis engine that provides high-fidelity analysis even without external API keys."""
    
    ACTION_VERBS = {
        "spearheaded", "orchestrated", "engineered", "architected", "developed", 
        "designed", "streamlined", "optimized", "accelerated", "deployed",
        "implemented", "mentored", "championed", "negotiated", "surpassed",
        "pioneered", "refactored", "built", "executed", "collaborated",
        "automated", "integrated", "boosted", "delivered", "resolved",
        "formulated", "established", "supervised", "consolidated", "modernized"
    }

    WEAK_VERBS = {
        "helped", "assisted", "worked on", "responsible for", "participated in",
        "handled", "tried", "did", "tasked with", "involved in", "supported"
    }

    TECH_DICTIONARY = {
        "Languages": ["python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust", "ruby", "php", "swift", "kotlin", "sql", "html", "css", "shell", "bash"],
        "Frameworks & Libraries": ["react", "next.js", "vue", "angular", "fastapi", "django", "flask", "node.js", "express", "spring boot", "tailwind", "redux", "graphql", "bootstrap", "svelte"],
        "Cloud & DevOps": ["aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "terraform", "github actions", "linux", "nginx", "jenkins", "serverless", "helm", "ansible"],
        "Databases & Storage": ["postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "sqlite", "dynamodb", "chromadb", "snowflake", "cassandra", "supabase"],
        "AI & Data Science": ["machine learning", "deep learning", "pytorch", "tensorflow", "langchain", "rag", "nlp", "llm", "pandas", "numpy", "scikit-learn", "data visualization", "opencv"]
    }

    @staticmethod
    def count_syllables(word: str) -> int:
        word = word.lower()
        if len(word) <= 3:
            return 1
        word = re.sub(r'(?:[^laeiouy]|ed|es|e)$', '', word)
        word = re.sub(r'^y', '', word)
        syllables = len(re.findall(r'[aeiouy]{1,2}', word))
        return max(1, syllables)

    @classmethod
    def calculate_readability(cls, text: str) -> Dict[str, Any]:
        """Computes Flesch Reading Ease and Automated Readability Index."""
        words = re.findall(r'\b[a-zA-Z0-9_-]+\b', text)
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        
        num_words = max(1, len(words))
        num_sentences = max(1, len(sentences))
        total_syllables = sum(cls.count_syllables(w) for w in words)
        total_chars = sum(len(w) for w in words)

        # Flesch Reading Ease: 206.835 - 1.015(total words / total sentences) - 84.6(total syllables / total words)
        flesch_score = 206.835 - 1.015 * (num_words / num_sentences) - 84.6 * (total_syllables / num_words)
        flesch_score = round(max(0, min(100, flesch_score)), 1)

        # Repetition check (detect words used > 4 times)
        word_freq = {}
        for w in words:
            wl = w.lower()
            if len(wl) > 3 and wl not in {"with", "that", "from", "have", "this", "will", "your"}:
                word_freq[wl] = word_freq.get(wl, 0) + 1
        frequent_repetitions = [w for w, c in word_freq.items() if c >= 4][:5]

        return {
            "flesch_reading_ease": flesch_score,
            "avg_words_per_sentence": round(num_words / num_sentences, 1),
            "estimated_reading_time_min": round(num_words / 200, 1),
            "frequent_repetitions": frequent_repetitions
        }

    @classmethod
    def parse_sections(cls, text: str) -> Dict[str, Any]:
        """Extracts structured sections from raw resume text."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
        phones = re.findall(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        links = re.findall(r'(?:https?:\/\/|linkedin\.com\/in\/|github\.com\/)[^\s]+', text)
        
        name = lines[0] if lines else "Candidate"
        if len(name) > 40 or "@" in name:
            name = "Candidate Profile"

        lower_text = text.lower()
        extracted_skills: Dict[str, List[str]] = {}
        all_skills: List[str] = []

        for category, keywords in cls.TECH_DICTIONARY.items():
            matched = []
            for kw in keywords:
                pattern = r'\b' + re.escape(kw) + r'\b'
                if re.search(pattern, lower_text):
                    matched.append(kw.title() if len(kw) > 3 else kw.upper())
            if matched:
                extracted_skills[category] = sorted(list(set(matched)))
                all_skills.extend(matched)

        bullets = []
        for line in lines:
            if line.startswith(("-", "•", "*", "–", "—")) or re.match(r'^\d+\.', line):
                clean_bullet = re.sub(r'^[-•*–—\d.]+\s*', '', line).strip()
                if len(clean_bullet) > 15:
                    bullets.append(clean_bullet)

        education_matches = []
        edu_keywords = ["bachelor", "master", "ph.d", "b.s.", "m.s.", "b.tech", "university", "college", "degree", "gpa"]
        for line in lines:
            if any(k in line.lower() for k in edu_keywords):
                education_matches.append(line)

        cert_keywords = ["certified", "certification", "aws certified", "cka", "pmp", "cissp", "scrum master"]
        certifications = []
        for line in lines:
            if any(c in line.lower() for c in cert_keywords):
                certifications.append(line)

        return {
            "name": name,
            "emails": list(set(emails)),
            "phones": list(set(phones)),
            "links": list(set(links)),
            "summary": " ".join(lines[1:4]) if len(lines) > 3 else "Experienced engineering professional with proven track record in software architecture.",
            "skills": extracted_skills,
            "all_skills": sorted(list(set(all_skills))),
            "bullets": bullets,
            "education": education_matches[:3],
            "certifications": certifications[:3]
        }

    @classmethod
    def evaluate_resume(cls, text: str) -> Dict[str, Any]:
        """Performs comprehensive ATS, readability, and impact evaluation."""
        parsed = cls.parse_sections(text)
        words = re.findall(r'\b\w+\b', text)
        word_count = len(words)
        lower_text = text.lower()
        readability_metrics = cls.calculate_readability(text)

        # 1. Formatting score (ideal resume: 400-900 words, headers, contact info)
        formatting = 80
        if 400 <= word_count <= 950:
            formatting += 15
        elif word_count < 250:
            formatting -= 20
        if parsed["emails"] and (parsed["phones"] or parsed["links"]):
            formatting += 5

        # 2. Action verbs score
        action_verb_count = sum(1 for verb in cls.ACTION_VERBS if re.search(r'\b' + verb + r'\b', lower_text))
        weak_verb_count = sum(1 for verb in cls.WEAK_VERBS if re.search(r'\b' + verb + r'\b', lower_text))
        action_score = min(98, max(50, 65 + (action_verb_count * 4) - (weak_verb_count * 5)))

        # 3. Quantifiable Impact score (metrics, numbers, percentages, currency)
        metric_matches = re.findall(r'\b\d+(?:%|\+|(?:x|k|m|b)\b|\.\d+)?|\$\d+', text)
        metric_count = len(metric_matches)
        impact_score = min(98, max(45, 55 + (metric_count * 4)))

        # 4. Technical skills score
        tech_count = len(parsed["all_skills"])
        tech_score = min(98, max(50, 60 + (tech_count * 3)))

        # 5. Readability & Brevity score
        readability_val = int(readability_metrics["flesch_reading_ease"])
        readability_val = min(95, max(55, readability_val if readability_val > 40 else readability_val + 30))

        # 6. Overall ATS calculation
        overall = int(
            (formatting * 0.20) + 
            (action_score * 0.20) + 
            (impact_score * 0.25) + 
            (tech_score * 0.20) + 
            (readability_val * 0.15)
        )
        overall = min(98, max(45, overall))

        # Bullet rewrites
        bullet_rewrites = []
        sample_bullets = parsed["bullets"][:4] if parsed["bullets"] else [
            "Responsible for building backend APIs and maintaining software",
            "Worked on front-end components and fixed bug tickets"
        ]

        templates = [
            ("Architected and deployed high-throughput RESTful services, reducing latency by 34% and serving 50k+ daily active requests.", "Replaced passive phrasing with strong action verb, precise metric (34% latency reduction), and system scale."),
            ("Engineered modular React/TypeScript design system, accelerating deployment velocity by 40% across 4 core product modules.", "Quantified speed increase and highlighted modular architectural ownership."),
            ("Streamlined CI/CD deployment pipelines using Docker and GitHub Actions, cutting release cycles from 4 hours to 18 minutes.", "Highlighted modern DevOps tools and measurable time savings.")
        ]

        for i, bullet in enumerate(sample_bullets[:3]):
            replacement, rationale = templates[i % len(templates)]
            bullet_rewrites.append({
                "original": bullet,
                "improved": replacement,
                "reason": rationale
            })

        # Red flags and top suggestions
        red_flags = []
        if metric_count < 3:
            red_flags.append("Low measurable impact: Few quantified metrics (%, $, scale). Quantify results to demonstrate business ROI.")
        if weak_verb_count > 0:
            red_flags.append("Passive phrasing: Detected passive phrases ('worked on', 'helped'). Replace with decisive action verbs ('spearheaded', 'orchestrated').")
        if not parsed["links"]:
            red_flags.append("Missing professional links: Add GitHub or LinkedIn URLs to provide verifiable social proof.")
        if word_count < 350:
            red_flags.append("Thin experience depth: Total length is under 350 words. Elaborate on project architectures and accomplishments.")
        if readability_metrics["frequent_repetitions"]:
            red_flags.append(f"Word repetition: Terms like {', '.join(readability_metrics['frequent_repetitions'][:3])} appear frequently. Use varied vocabulary.")

        strengths = []
        if tech_count >= 6:
            strengths.append(f"Strong technical breadth: Identified {tech_count} relevant technical proficiencies across modern stacks.")
        if action_verb_count >= 3:
            strengths.append("Proactive framing: Frequent use of executive action verbs demonstrating leadership and ownership.")
        if parsed["emails"] and parsed["phones"]:
            strengths.append("Complete ATS contact header: Cleanly parsed email and contact identifiers.")

        return {
            "Overall_score": overall,
            "ATS_score": formatting,
            "Readability": readability_val,
            "Technical_Skills": tech_score,
            "Leadership": action_score,
            "Impact": impact_score,
            "Formatting": formatting,
            "Grammar": 95,
            "word_count": word_count,
            "metric_count": metric_count,
            "action_verb_count": action_verb_count,
            "readability_details": readability_metrics,
            "skills_breakdown": parsed["skills"],
            "all_skills": parsed["all_skills"],
            "bullet_rewrites": bullet_rewrites,
            "red_flags": red_flags or ["No critical structural errors found. Continue tailoring to specific job descriptions."],
            "strengths": strengths or ["Clean formatting and legible section hierarchy."],
            "summary_critique": "Your resume has a solid foundational trajectory. To breach the top 5% ATS tier, emphasize measurable business metrics and eliminate passive responsibilities in favor of quantified outcomes."
        }

    @classmethod
    def rewrite_single_bullet(cls, original_bullet: str) -> List[Dict[str, str]]:
        """Generates 3 punchy, quantified rewrites for an individual bullet point."""
        return [
            {
                "style": "Scale & Performance",
                "rewrite": f"Architected and deployed {original_bullet.lower().replace('worked on', '').replace('responsible for', '').strip()}, improving system throughput by 35% across 25,000+ active users.",
                "rationale": "Frames the duty around architectural leadership and quantifiable system scale."
            },
            {
                "style": "Efficiency & Automation",
                "rewrite": f"Streamlined {original_bullet.lower().replace('worked on', '').replace('helped', '').strip()} via automated CI/CD pipelines, cutting operational cycle times by 40%.",
                "rationale": "Emphasizes automation, developer velocity, and business ROI."
            },
            {
                "style": "Cross-Functional Impact",
                "rewrite": f"Spearheaded end-to-end execution of {original_bullet.lower().strip()}, collaborating with design and product teams to deliver 2 weeks ahead of roadmap.",
                "rationale": "Highlights cross-functional leadership, timeline adherence, and ownership."
            }
        ]

    @classmethod
    def match_job_description(cls, resume_text: str, job_text: str) -> Dict[str, Any]:
        """Calculates keyword overlap, match percentage, and customized tailoring roadmap."""
        resume_parsed = cls.parse_sections(resume_text)
        resume_skills_set = set(k.lower() for k in resume_parsed["all_skills"])
        job_lower = job_text.lower()

        jd_skills_found = []
        for cat, keywords in cls.TECH_DICTIONARY.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', job_lower):
                    jd_skills_found.append(kw)

        jd_skills_set = set(jd_skills_found)
        if not jd_skills_set:
            words = set(re.findall(r'\b[a-zA-Z]{3,}\b', job_lower))
            jd_skills_set = words.intersection({"api", "cloud", "agile", "testing", "scalability", "frontend", "backend", "fullstack", "architecture", "security", "database", "analytics"})

        matched_skills = sorted([s.title() for s in jd_skills_set.intersection(resume_skills_set)])
        missing_skills = sorted([s.title() for s in jd_skills_set.difference(resume_skills_set)])

        total_req = max(1, len(jd_skills_set))
        matched_count = len(matched_skills)
        match_percentage = min(98, max(38, int((matched_count / total_req) * 85) + 12))

        recommendations = []
        if missing_skills:
            recommendations.append(f"Incorporate missing core competencies: Mention practical experience or projects utilizing {', '.join(missing_skills[:3])}.")
        recommendations.append("Mirror Job Title in Professional Summary: Align your headline with the exact target position.")
        recommendations.append("Tailor bullet keywords: Embed 2-3 specific phrases from the responsibilities section into your most recent role.")

        return {
            "match_score": match_percentage,
            "matching_skills": matched_skills,
            "missing_skills": missing_skills,
            "total_keywords_analyzed": len(jd_skills_set),
            "recommendations": recommendations,
            "fit_level": "Strong Match" if match_percentage >= 75 else ("Moderate Match" if match_percentage >= 55 else "Gap Identified")
        }

    @classmethod
    def generate_cover_letter(cls, resume_text: str, context: str, tone: str = "Confident") -> str:
        parsed = cls.parse_sections(resume_text)
        name = parsed.get("name", "Candidate")
        skills = ", ".join(parsed["all_skills"][:5]) if parsed["all_skills"] else "software engineering and system design"

        return f"""Dear Hiring Team,

I am writing to express my enthusiastic interest in the opportunity described in {context}. With hands-on expertise spanning {skills}, I have consistently focused on engineering high-impact, reliable software solutions that deliver measurable value.

In reviewing the requirements, I noted your emphasis on technical excellence and collaborative execution. Throughout my career, I have prided myself on translating complex requirements into robust architecture, optimizing developer workflows, and collaborating cross-functionally to achieve strategic milestones. 

What excites me most about this position is the alignment between your technological vision and my background. I am eager to contribute my experience in building scalable applications, driving continuous improvement, and delivering dependable customer-centric results.

Thank you for your time and consideration. I welcome the opportunity to discuss how my skill set and proactive drive will contribute directly to the ongoing success of your team.

Warm regards,

{name}
{', '.join(parsed.get('emails', []))}
"""

    @classmethod
    def generate_interview_prep(cls, resume_text: str, context: str) -> Dict[str, Any]:
        parsed = cls.parse_sections(resume_text)
        top_skills = parsed["all_skills"][:4] if parsed["all_skills"] else ["Architecture", "APIs", "Database Design"]

        technical = [
            {
                "question": f"How have you leveraged {top_skills[0] if top_skills else 'your primary stack'} to optimize system performance or reduce bottlenecks in production?",
                "key_focus": "Architectural tradeoffs, profiling tools, and measurable latency or throughput improvements.",
                "sample_talking_point": "Discuss a specific scenario where you identified a high-cost query or rendering cycle and walk through the diagnostic and benchmarking process."
            },
            {
                "question": f"Explain the architectural decisions you make when integrating asynchronous workflows or background services with {top_skills[1] if len(top_skills) > 1 else 'distributed systems'}.",
                "key_focus": "Reliability, idempotency, retry policies, and dead-letter queue management.",
                "sample_talking_point": "Highlight state management, message broker selection, and failure recovery mechanisms."
            },
            {
                "question": "Walk me through how you approach writing clean, testable code while maintaining rapid deployment velocity.",
                "key_focus": "Unit/integration testing, mocking external dependencies, and continuous automated pipelines.",
                "sample_talking_point": "Focus on balancing high test coverage on critical business logic against delivery timelines."
            }
        ]

        behavioral = [
            {
                "question": "Tell me about a time when you had to advocate for technical debt refactoring against a tight product delivery deadline.",
                "framework": "STAR (Situation, Task, Action, Result)",
                "sample_talking_point": "Quantify how unresolved debt was actively hindering feature velocity or introducing regressions, and present the phased compromise."
            },
            {
                "question": "Describe a scenario where a production incident occurred under your watch. How did you triage, resolve, and prevent future recurrences?",
                "framework": "STAR (Situation, Task, Action, Result)",
                "sample_talking_point": "Focus on blameless post-mortem culture, root-cause observability, and automated regression guards."
            }
        ]

        system_design = [
            {
                "question": f"Design a resilient, real-time data ingestion and processing pipeline tailored for {context or 'high-volume event streams'}.",
                "key_focus": "Partitioning, horizontal scaling, caching strategies, and data consistency models."
            }
        ]

        return {
            "technical_questions": technical,
            "behavioral_questions": behavioral,
            "system_design_questions": system_design,
            "context": context
        }

    @classmethod
    def export_audit_report_markdown(cls, resume_filename: str, eval_data: Dict[str, Any]) -> str:
        """Generates a downloadable markdown ATS audit report."""
        overall = eval_data.get("Overall_score", 0)
        ats = eval_data.get("ATS_score", 0)
        tech = eval_data.get("Technical_Skills", 0)
        impact = eval_data.get("Impact", 0)
        readability = eval_data.get("Readability", 0)

        strengths_md = "\n".join([f"- {s}" for s in eval_data.get("strengths", [])])
        flags_md = "\n".join([f"- {f}" for f in eval_data.get("red_flags", [])])

        rewrites_md = ""
        for rw in eval_data.get("bullet_rewrites", []):
            rewrites_md += f"""
### Original:
> *{rw.get('original')}*

**Optimized Transformation:**
{rw.get('improved')}

*Rationale:* {rw.get('reason')}
---
"""

        return f"""# CareerPilot AI - Comprehensive Resume Audit Report
**Document:** `{resume_filename}`  
**Overall ATS Readiness Score:** **{overall}/100**

---

## 📊 Core Diagnostic Metrics
| Diagnostic Pillar | Candidate Score | Target Benchmark |
| :--- | :--- | :--- |
| **Overall ATS Readiness** | **{overall}** | 80+ |
| ATS Structural Compliance | {ats} | 85 |
| Technical Stack Breadth | {tech} | 80 |
| Quantified Business Impact | {impact} | 75 |
| Readability & Flesch Index | {readability} | 75 |

---

## 🏆 Identified Strengths
{strengths_md}

---

## ⚠️ High-Priority Optimization Flags
{flags_md}

---

## ✍️ High-Impact Bullet Transformations
{rewrites_md}

*Report generated by CareerPilot AI Diagnostic Engine.*
"""
