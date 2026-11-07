import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_pipeline():
    print("\n--- 1. Testing System & Health Endpoints ---")
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print("[OK] Root OK:", res.json())

    res = client.get("/health")
    assert res.status_code == 200
    print("[OK] Health OK")

    res = client.get("/api/v1/system/status")
    assert res.status_code == 200
    print("[OK] System status OK:", res.json())

    print("\n--- 2. Testing Auth: Register, Login, Profile ---")
    test_email = "alex.dev@careerpilot.ai"
    test_pass = "TestSecurePassword123!"

    reg_res = client.post("/api/v1/auth/register", json={"email": test_email, "password": test_pass})
    if reg_res.status_code == 400 and "already exists" in reg_res.text:
        print("[OK] User already exists from previous test run")
    else:
        assert reg_res.status_code == 200, f"Register failed: {reg_res.text}"
        print("[OK] Registration OK")

    login_res = client.post("/api/v1/auth/login", data={"username": test_email, "password": test_pass})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[OK] Login OK, token acquired")

    # Update profile
    prof_res = client.put("/api/v1/auth/me", headers=headers, json={"full_name": "Alex Rivera", "target_title": "Lead Platform Engineer"})
    assert prof_res.status_code == 200
    assert prof_res.json()["full_name"] == "Alex Rivera"
    print("[OK] Profile update OK")

    print("\n--- 3. Testing Resume Upload & Indexing ---")
    sample_resume_content = """Alex Rivera
Senior Software Engineer
alex.rivera@example.com | (555) 234-5678 | github.com/alexrivera | linkedin.com/in/alexrivera

Summary:
Proven Full-Stack Software Engineer with 6+ years of experience designing high-scale distributed systems, React web applications, and cloud-native microservices.

Skills:
Languages: Python, TypeScript, JavaScript, Go, SQL
Frameworks: React, Next.js, FastAPI, Node.js, Express, Tailwind
Cloud & DevOps: Docker, Kubernetes, AWS, CI/CD, GitHub Actions
Databases: PostgreSQL, Redis, MongoDB, ChromaDB

Experience:
Senior Software Engineer | CloudScale Inc. | 2022 - Present
- Architected and deployed microservices backend using FastAPI and PostgreSQL, serving 120,000+ daily active users.
- Reduced API response p99 latency from 450ms to 78ms through Redis distributed caching and database connection pooling.
- Spearheaded the frontend migration to React 18 and Next.js, boosting page load speeds by 42%.
- Automated continuous delivery workflows using GitHub Actions and Docker, cutting staging deployment cycles from 3 hours to 14 minutes.

Software Engineer | DevMatrix Labs | 2019 - 2022
- Developed responsive customer dashboard using React and TypeScript for 15,000 corporate clients.
- Implemented real-time telemetry websocket stream handling 5,000 events/second.
- Mentored 4 junior engineers and championed automated end-to-end testing practices.

Education:
Bachelor of Science in Computer Science | University of California, Berkeley | GPA: 3.8
"""
    file_bytes = io.BytesIO(sample_resume_content.encode("utf-8"))
    upload_res = client.post(
        "/api/v1/resume/upload",
        headers=headers,
        files={"file": ("alex_rivera_resume.txt", file_bytes, "text/plain")}
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    resume_data = upload_res.json()
    resume_id = resume_data["id"]
    print("[OK] Upload & Index OK:", resume_data)

    print("\n--- 4. Testing Resume Listing & Update ---")
    list_res = client.get("/api/v1/resume/", headers=headers)
    assert list_res.status_code == 200
    resumes = list_res.json()
    assert len(resumes) > 0
    print(f"[OK] Resumes list OK (Count: {len(resumes)})")

    # Update title and text
    up_res = client.put(f"/api/v1/resume/{resume_id}", headers=headers, json={"title": "Primary Executive CV", "is_primary": True})
    assert up_res.status_code == 200
    print("[OK] Resume update OK")

    print("\n--- 5. Testing Deep ATS Scorecard & Analysis ---")
    score_res = client.get(f"/api/v1/analysis/{resume_id}/score?refresh=true", headers=headers)
    assert score_res.status_code == 200, f"Score failed: {score_res.text}"
    score_data = score_res.json()["score_data"]
    print("[OK] ATS Scorecard calculated:", {
        "Overall_score": score_data.get("Overall_score"),
        "ATS_score": score_data.get("ATS_score"),
        "Technical_Skills": score_data.get("Technical_Skills"),
        "Leadership": score_data.get("Leadership"),
        "Impact": score_data.get("Impact"),
        "Rewrites_count": len(score_data.get("bullet_rewrites", []))
    })

    # Test single bullet rewrite
    rw_res = client.post("/api/v1/analysis/rewrite-bullet", headers=headers, json={"bullet": "Responsible for managing servers and writing Python scripts"})
    assert rw_res.status_code == 200
    print("[OK] Single bullet rewrite OK:", len(rw_res.json().get("rewrites", [])))

    # Test markdown report export
    exp_res = client.get(f"/api/v1/resume/{resume_id}/export", headers=headers)
    assert exp_res.status_code == 200
    assert "CareerPilot AI" in exp_res.text
    print("[OK] Audit report export OK (Length:", len(exp_res.text), ")")

    print("\n--- 6. Testing Job Description Matcher & Job Applications ---")
    target_jd = """We are seeking a Lead Full Stack Engineer to build next-generation cloud platforms.
Requirements:
- 5+ years of software development experience with React, TypeScript, and Python.
- Proven experience with FastAPI or Django building scalable microservices.
- Experience with Docker, Kubernetes, and AWS infrastructure.
- Familiarity with PostgreSQL, Redis, and high-throughput databases.
- Strong knowledge of CI/CD pipelines and agile practices.
"""
    match_res = client.post(
        "/api/v1/analysis/match",
        headers=headers,
        json={"resume_id": resume_id, "job_description": target_jd}
    )
    assert match_res.status_code == 200, f"Match failed: {match_res.text}"
    match_info = match_res.json()["match_data"]
    print("[OK] Job Match Result:", {
        "score": match_info.get("match_score"),
        "matched": match_info.get("matching_skills"),
        "missing": match_info.get("missing_skills"),
        "fit": match_info.get("fit_level")
    })

    # Save to Job Applications tracker
    app_res = client.post(
        "/api/v1/applications/",
        headers=headers,
        json={
            "company_name": "Stripe",
            "job_title": "Lead Full Stack Engineer",
            "job_description": target_jd,
            "resume_id": resume_id,
            "status": "Applied"
        }
    )
    assert app_res.status_code == 200
    app_id = app_res.json()["id"]
    print("[OK] Job Application saved OK:", app_id)

    app_list = client.get("/api/v1/applications/", headers=headers)
    assert app_list.status_code == 200
    assert len(app_list.json()) >= 1
    print("[OK] Job Applications listed OK")

    print("\n--- 7. Testing Career Coach RAG Chat ---")
    chat_queries = [
        "What are my top 3 technical strengths based on my resume?",
        "Suggest how I can quantify my experience bullet points even better.",
    ]
    for q in chat_queries:
        c_res = client.post(
            "/api/v1/chat/",
            headers=headers,
            json={"query": q, "resume_id": resume_id}
        )
        assert c_res.status_code == 200, f"Chat failed: {c_res.text}"
        ans = c_res.json()
        print(f"[OK] Chat Q: '{q}' -> Answer Length: {len(ans['answer'])}, Provider: {ans.get('provider')}")

    print("\n--- 8. Testing Cover Letter & Interview Prep ---")
    cov_res = client.post(
        "/api/v1/analysis/cover-letter",
        headers=headers,
        json={"resume_id": resume_id, "context": "Senior Platform Engineer at Stripe", "tone": "Confident"}
    )
    assert cov_res.status_code == 200
    print("[OK] Cover Letter generated. Word count:", len(cov_res.json()["cover_letter"].split()))

    prep_res = client.post(
        "/api/v1/analysis/interview-prep",
        headers=headers,
        json={"resume_id": resume_id, "context": "Staff Engineer - Distributed Systems"}
    )
    assert prep_res.status_code == 200
    prep_data = prep_res.json()["interview_prep"]
    print("[OK] Interview Prep OK. Tech questions count:", len(prep_data.get("technical_questions", [])))

    print("\n===> ALL IMPROVED BACKEND PIPELINE TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_full_pipeline()
