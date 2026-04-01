from __future__ import annotations

import google.generativeai as genai

from app.config import get_settings
from app.models.schemas import CompanyData


class GeminiService:
    def __init__(self) -> None:
        settings = get_settings()
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def _generate_text(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        text = getattr(response, "text", "")
        if not text:
            raise ValueError("Gemini returned empty content")
        return text.strip()

    def summarize_resume(self, resume_text: str) -> str:
        prompt = (
            "Summarize this resume for cold-email personalization. "
            "Return a concise professional summary in 4-6 sentences. "
            "Focus on skills, impact, and relevant projects.\n\n"
            f"Resume Text:\n{resume_text[:12000]}"
        )
        return self._generate_text(prompt)

    def summarize_github(self, github_url: str, project_descriptions: list[str] | None = None) -> str:
        project_text = "\n".join(project_descriptions or [])
        prompt = (
            "Create a concise GitHub/project profile summary for job outreach emails. "
            "Use a factual and professional tone. Keep it to 3-5 sentences.\n\n"
            f"GitHub URL: {github_url}\n"
            f"Project Notes:\n{project_text[:6000]}"
        )
        return self._generate_text(prompt)

    def generate_email(
        self,
        company_data: CompanyData,
        resume_summary: str,
        github_summary: str | None,
    ) -> str:
        prompt = (
            "You are an expert cold email writer helping a software engineer get interviews.\n"
            "Write one concise, personalized email body (max 150 words).\n"
            "Avoid generic phrases and buzzwords. Use concrete relevance.\n"
            "Keep it professional and human. End with a clear call to action.\n"
            "Output only the email body, no markdown.\n\n"
            f"Company: {company_data.company_name}\n"
            f"Role: {company_data.role or 'Not specified'}\n"
            f"Notes: {company_data.notes or 'None'}\n"
            f"Candidate Resume Summary:\n{resume_summary}\n\n"
            f"Candidate GitHub Summary:\n{github_summary or 'None'}\n"
            f"Recipient Email: {company_data.contact_email}"
        )
        return self._generate_text(prompt)

    def summarize_repos(self, repos: list[dict]) -> list[str]:
        """Generate one-line summaries for a list of GitHub repos."""
        if not repos:
            return []

        repo_descriptions = []
        for i, repo in enumerate(repos):
            topics = ", ".join(repo.get("topics", []))
            repo_descriptions.append(
                f"{i + 1}. {repo['name']}: {repo.get('description', 'No description')} "
                f"(language: {repo.get('language', 'unknown')}, topics: {topics or 'none'})"
            )

        prompt = (
            "For each GitHub repository below, write exactly ONE concise sentence summary. "
            "Focus on what the project does and its tech stack. "
            "Return exactly one line per repo, numbered to match the input.\n\n"
            + "\n".join(repo_descriptions)
        )

        raw = self._generate_text(prompt)

        # Parse numbered lines
        lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]
        summaries = []
        for line in lines:
            # Remove numbering like "1. " or "1) "
            cleaned = line.lstrip("0123456789.)")
            summaries.append(cleaned.strip())

        # Pad with fallbacks if Gemini returned fewer lines
        while len(summaries) < len(repos):
            idx = len(summaries)
            summaries.append(repos[idx].get("description") or f"A {repos[idx].get('language', '')} project")

        return summaries[:len(repos)]


gemini_service = GeminiService()
