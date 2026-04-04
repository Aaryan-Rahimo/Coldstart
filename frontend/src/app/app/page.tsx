"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, CircleDashed, Clock3, Sparkles } from "lucide-react";

import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";
import { DraftRecord, DocumentRecord, formatLongDate, formatShortDate, getDisplayName, getGreeting } from "@/lib/coldstart";
import { createClient } from "@/lib/supabase";

type GithubProject = {
  repo_name: string;
  summary: string;
  language: string;
  languages: string[];
  stars: number;
  github_url: string;
};

export default function AppPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pendingDrafts, setPendingDrafts] = useState<DraftRecord[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [displayName, setDisplayName] = useState("there");
  const [hasGithub, setHasGithub] = useState<boolean | null>(null);
  const [hasGmail, setHasGmail] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<GithubProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    setIsDark(dark);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setDisplayName(getDisplayName((user.user_metadata?.display_name as string | undefined) ?? null, user.email));

      const [draftsResult, docsResult] = await Promise.all([
        supabase.from("drafts").select("*").order("created_at", { ascending: false }),
        supabase.from("documents").select("*").order("uploaded_at", { ascending: false }),
      ]);

      const drafts = (draftsResult.data ?? []) as DraftRecord[];
      const docs = (docsResult.data ?? []) as DocumentRecord[];

      setAllDrafts(drafts);
      setPendingDrafts(drafts.filter((draft) => draft.status === "pending"));
      setDocuments(docs);
      setLoading(false);
    }

    loadDashboard();
  }, [supabase]);

  useEffect(() => {
    async function checkConnections() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch("/api/backend/auth/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const text = await res.text();
        if (!text.trim()) return;
        let data: { success?: boolean; has_github?: boolean; has_google?: boolean } = {};
        try {
          data = JSON.parse(text) as { success?: boolean; has_github?: boolean; has_google?: boolean };
        } catch {
          console.error("Failed to parse auth/me response:", text);
          return;
        }
        if (data.success) {
          setHasGithub(Boolean(data.has_github));
          setHasGmail(Boolean(data.has_google));
        }
      } catch (e) {
        console.error("Failed to check connections:", e);
      }
    }
    checkConnections();
  }, []);

  useEffect(() => {
    async function loadProjects() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setProjects([]);
        setProjectsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/backend/github/projects", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const text = await res.text();
        if (!text.trim()) {
          setProjects([]);
          return;
        }

        const payload = JSON.parse(text) as { success?: boolean; projects?: GithubProject[] };
        if (payload.success) {
          setProjects(payload.projects ?? []);
        } else {
          setProjects([]);
        }
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    }

    loadProjects();
  }, [supabase]);

  const stats = useMemo(() => {
    return {
      pending: allDrafts.filter((draft) => draft.status === "pending").length,
      sent: allDrafts.filter((draft) => draft.status === "sent").length,
      accepted: allDrafts.filter((draft) => draft.status === "accepted").length,
      rejected: allDrafts.filter((draft) => draft.status === "rejected").length,
    };
  }, [allDrafts]);

  const checklist = useMemo(() => {
    const hasPdf = documents.some((doc) => doc.file_type === "pdf");
    const hasCsv = documents.some((doc) => doc.file_type === "csv");
    const hasDraft = allDrafts.length > 0;

    return [
      { label: "Upload your resume", done: hasPdf, ctaHref: "/app/documents" },
      { label: "Upload a CSV", done: hasCsv, ctaHref: "/app/documents" },
      { label: "Generate your first draft", done: hasDraft, ctaHref: "/app/drafts?tab=generate" },
    ];
  }, [documents, allDrafts]);

  const now = new Date();

  return (
    <div className={`dashboard-page min-h-full px-5 py-6 md:px-8 md:py-8 ${isDark ? "bg-[#120F0F] text-[#F5EFEF]" : "bg-[#F5F3F0] text-[#241816]"}`}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className={`rounded-2xl border px-5 py-5 md:px-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#EDE2DA]"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-semibold">{getGreeting(now)}, {displayName}</h1>
              <p className="mt-1 text-[14px] text-[#6F5A52] dark:text-[#B09898]">{formatLongDate(now)}</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${isDark ? "bg-[#252020] text-[#B09898]" : "bg-[#FAF2ED] text-[#7A6158]"}`}>
              <CalendarDays size={14} />
              Dashboard overview
            </div>
          </div>
        </header>

        <OnboardingBanner />

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            hasGithub ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-950/25" : "border-[#EBE0DC] bg-white dark:border-[#2E2626] dark:bg-[#1C1717]"
          }`}>
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#1A1210]">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <div>
                <p className="text-[14px] font-semibold text-[#1A1210] dark:text-[#F5EFEF]">GitHub</p>
                <p className={`text-[12px] ${hasGithub ? "text-green-600" : "text-[#A08880]"}`}>
                  {hasGithub === null ? "Checking..." : hasGithub ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {hasGithub === false && (
              <button
                onClick={() => supabase.auth.signInWithOAuth({
                  provider: "github",
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                })}
                className="text-[13px] font-semibold bg-[#1A1210] text-white rounded-full px-4 py-1.5 hover:opacity-80 transition-opacity"
              >
                Connect GitHub
              </button>
            )}
            {hasGithub === true && (
              <span className="text-[12px] font-semibold text-green-600">✓ Connected</span>
            )}
          </div>

          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            hasGmail ? "border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-950/25" : "border-[#EBE0DC] bg-white dark:border-[#2E2626] dark:bg-[#1C1717]"
          }`}>
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div>
                <p className="text-[14px] font-semibold text-[#1A1210] dark:text-[#F5EFEF]">Gmail</p>
                <p className={`text-[12px] ${hasGmail ? "text-green-600" : "text-[#A08880]"}`}>
                  {hasGmail === null ? "Checking..." : hasGmail ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {hasGmail === false && (
              <button
                onClick={() => supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    scopes: "https://www.googleapis.com/auth/gmail.send",
                    queryParams: { access_type: "offline", prompt: "consent" },
                  },
                })}
                className="text-[13px] font-semibold bg-[#D94048] text-white rounded-full px-4 py-1.5 hover:bg-[#C13540] transition-colors"
              >
                Connect Gmail
              </button>
            )}
            {hasGmail === true && (
              <span className="text-[12px] font-semibold text-green-600">✓ Connected</span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E9DDD5] bg-white p-5 dark:border-[#2E2626] dark:bg-[#1C1717]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-[#1E1310] dark:text-[#F5EFEF]">GitHub Projects</h2>
            <Link href="/app/documents" className="text-[12px] font-medium text-[#E53935] hover:underline">
              Manage in Documents
            </Link>
          </div>
          {projectsLoading ? (
            <p className="text-[13px] text-[#7E675E] dark:text-[#B09898]">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-[13px] text-[#7E675E] dark:text-[#B09898]">No synced projects yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {projects.slice(0, 6).map((project) => (
                <div key={project.repo_name} className="rounded-lg border border-[#E8DDD6] bg-[#FBF7F4] p-3 dark:border-[#2E2626] dark:bg-[#171313]">
                  <p className="truncate text-[13px] font-semibold text-[#1E1310] dark:text-[#F5EFEF]">{project.repo_name}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[#6F5A52] dark:text-[#B09898]">{project.summary || "No summary available."}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                onClick={() => router.push("/app/drafts?tab=review&status=pending")}
                className="rounded-xl border border-[#E9DDD5] bg-white p-4 text-left shadow-[0_6px_20px_rgba(54,35,26,0.04)] transition hover:-translate-y-[1px] dark:border-[#2E2626] dark:bg-[#1C1717]"
              >
                <p className="text-[13px] text-[#866E65] dark:text-[#B09898]">Pending Draft Reviews</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310] dark:text-[#F5EFEF]">{loading ? "--" : stats.pending}</p>
              </button>

              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 shadow-[0_6px_20px_rgba(54,35,26,0.04)] dark:border-[#2E2626] dark:bg-[#1C1717]">
                <p className="text-[13px] text-[#866E65] dark:text-[#B09898]">Emails Sent</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310] dark:text-[#F5EFEF]">{loading ? "--" : stats.sent}</p>
              </div>

              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 shadow-[0_6px_20px_rgba(54,35,26,0.04)] dark:border-[#2E2626] dark:bg-[#1C1717]">
                <p className="text-[13px] text-[#866E65] dark:text-[#B09898]">Accepted</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310] dark:text-[#F5EFEF]">{loading ? "--" : stats.accepted}</p>
              </div>

              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 shadow-[0_6px_20px_rgba(54,35,26,0.04)] dark:border-[#2E2626] dark:bg-[#1C1717]">
                <p className="text-[13px] text-[#866E65] dark:text-[#B09898]">Rejected</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310] dark:text-[#F5EFEF]">{loading ? "--" : stats.rejected}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] xl:col-span-2 dark:border-[#2E2626] dark:bg-[#1C1717]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold dark:text-[#F5EFEF]">Pending Draft Reviews</h2>
                  <button
                    className="text-[13px] text-[#E53935] hover:underline"
                    onClick={() => router.push("/app/drafts?tab=review&status=pending")}
                  >
                    Open Drafts
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="h-12 rounded-lg bg-gradient-to-r from-[#F4ECE7] via-[#FBF8F6] to-[#F4ECE7] bg-[length:200%_100%] animate-[shimmer_1.8s_infinite] dark:from-[#252020] dark:via-[#2B2424] dark:to-[#252020]" />
                    ))}
                  </div>
                ) : pendingDrafts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E4D8D1] bg-[#FBF8F5] p-8 text-center dark:border-[#3A3030] dark:bg-[#171313]">
                    <Clock3 className="mx-auto text-[#C1AAA0]" size={24} />
                    <p className="mt-3 text-[15px] font-medium text-[#3A2A25] dark:text-[#F5EFEF]">No pending drafts - go generate some!</p>
                    <button
                      className="mt-4 rounded-lg bg-[#E53935] px-4 py-2 text-[13px] font-medium text-white"
                      onClick={() => router.push("/app/drafts?tab=generate")}
                    >
                      Generate Drafts
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[580px] text-left">
                      <thead>
                        <tr className="text-[12px] text-[#8A7268] dark:text-[#B09898]">
                          <th className="py-2">Company Name</th>
                          <th className="py-2">Contact Email</th>
                          <th className="py-2">Date Generated</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingDrafts.slice(0, 8).map((draft) => (
                          <tr key={draft.id} className="border-t border-[#EFE5DE] text-[14px] dark:border-[#2E2626]">
                            <td className="py-3 font-medium dark:text-[#F5EFEF]">{draft.company_name}</td>
                            <td className="py-3 text-[#6F5A52] dark:text-[#B09898]">{draft.contact_email}</td>
                            <td className="py-3 text-[#6F5A52] dark:text-[#B09898]">{formatShortDate(draft.created_at)}</td>
                            <td className="py-3 text-right">
                              <button
                                className="rounded-md border border-[#F1C5C4] bg-[#FDEEEE] px-3 py-1.5 text-[12px] text-[#B92826]"
                                onClick={() => router.push(`/app/drafts?tab=review&status=pending&draftId=${draft.id}`)}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] dark:border-[#2E2626] dark:bg-[#1C1717]">
                  <div className="inline-flex rounded-full bg-[#FCEBEA] px-2.5 py-1 text-[11px] font-medium text-[#A62927]">Coming Soon</div>
                  <h3 className="mt-3 text-[16px] font-semibold dark:text-[#F5EFEF]">AI Company Suggestions</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#6D5850] dark:text-[#B09898]">
                    We&apos;ll recommend companies to cold email based on your profile. Coming soon.
                  </p>
                  <div className="mt-4 rounded-lg border border-dashed border-[#EADCD4] bg-[#FCF8F6] p-3 text-[12px] text-[#8A7268] dark:border-[#3A3030] dark:bg-[#171313] dark:text-[#B09898]">
                    Suggestions will appear here once this module launches.
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] dark:border-[#2E2626] dark:bg-[#1C1717]">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#E53935]" />
                    <h3 className="text-[16px] font-semibold dark:text-[#F5EFEF]">Onboarding Checklist</h3>
                  </div>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => router.push(item.ctaHref)}
                        className="flex w-full items-center gap-2 rounded-lg border border-[#EEE3DC] px-3 py-2 text-left text-[13px] dark:border-[#2E2626] dark:bg-[#171313]"
                      >
                        {item.done ? (
                          <CheckCircle2 size={16} className="text-[#2E8B57]" />
                        ) : (
                          <CircleDashed size={16} className="text-[#B79F96]" />
                        )}
                        <span className={item.done ? "text-[#2E8B57]" : "text-[#4B3934]"}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
        </>
      </div>
    </div>
  );
}
