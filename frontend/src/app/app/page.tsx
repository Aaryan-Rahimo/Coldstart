"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, CircleDashed, Clock3, MailCheck, MailX, Sparkles } from "lucide-react";

import { DashboardEmails } from "@/components/emails/DashboardEmails";
import { DraftRecord, DocumentRecord, formatLongDate, formatShortDate, getDisplayName, getGreeting } from "@/lib/coldstart";
import { createClient } from "@/lib/supabase";
import { useEmailsStore } from "@/store/emails";

export default function AppPage() {
  const supabase = createClient();
  const router = useRouter();
  const loadEmails = useEmailsStore((state) => state.loadEmails);

  const [loading, setLoading] = useState(true);
  const [pendingDrafts, setPendingDrafts] = useState<DraftRecord[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [displayName, setDisplayName] = useState("there");
  const [gmailConnected, setGmailConnected] = useState(false);

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

      await loadEmails();

      setDisplayName(getDisplayName((user.user_metadata?.display_name as string | undefined) ?? null, user.email));

      const [draftsResult, docsResult, gmailConnectionResult] = await Promise.all([
        supabase.from("drafts").select("*").order("created_at", { ascending: false }),
        supabase.from("documents").select("*").order("uploaded_at", { ascending: false }),
        supabase.from("gmail_connections").select("id").eq("user_id", user.id).limit(1),
      ]);

      const drafts = (draftsResult.data ?? []) as DraftRecord[];
      const docs = (docsResult.data ?? []) as DocumentRecord[];

      setAllDrafts(drafts);
      setPendingDrafts(drafts.filter((draft) => draft.status === "pending"));
      setDocuments(docs);
      setGmailConnected(!gmailConnectionResult.error && (gmailConnectionResult.data?.length ?? 0) > 0);
      setLoading(false);
    }

    loadDashboard();
  }, [loadEmails, supabase]);

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
    <div className="min-h-full px-5 py-6 md:px-8 md:py-8 bg-[#F5F3F0] text-[#241816]">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white border border-[#EDE2DA] px-5 py-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-semibold">{getGreeting(now)}, {displayName}</h1>
              <p className="mt-1 text-[14px] text-[#6F5A52]">{formatLongDate(now)}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FAF2ED] px-3 py-1.5 text-[12px] text-[#7A6158]">
              <CalendarDays size={14} />
              Dashboard overview
            </div>
          </div>
        </header>

        {!loading && !gmailConnected && (
          <section className="rounded-2xl border border-[#E9DDD5] bg-white p-6 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
            <h2 className="text-[18px] font-semibold text-[#1E1310]">Connect Gmail</h2>
            <p className="mt-2 text-[14px] text-[#6F5A52]">
              You can still use the dashboard, but sending emails requires a Gmail connection.
            </p>
            <button
              onClick={() => {
                window.location.href = "/api/google/auth";
              }}
              className="mt-4 rounded-lg bg-[#E53935] px-4 py-2 text-[13px] font-medium text-white"
            >
              Connect Gmail
            </button>
          </section>
        )}

        <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                onClick={() => router.push("/app/drafts?tab=review&status=pending")}
                className="rounded-xl border border-[#E9DDD5] bg-white p-4 text-left shadow-[0_6px_20px_rgba(54,35,26,0.04)] transition hover:-translate-y-[1px]"
              >
                <p className="text-[13px] text-[#866E65]">Pending Draft Reviews</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310]">{loading ? "--" : stats.pending}</p>
              </button>

              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 shadow-[0_6px_20px_rgba(54,35,26,0.04)]">
                <p className="text-[13px] text-[#866E65]">Emails Sent</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310]">{loading ? "--" : stats.sent}</p>
              </div>

              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 shadow-[0_6px_20px_rgba(54,35,26,0.04)]">
                <p className="text-[13px] text-[#866E65]">Accepted</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310]">{loading ? "--" : stats.accepted}</p>
              </div>

              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 shadow-[0_6px_20px_rgba(54,35,26,0.04)]">
                <p className="text-[13px] text-[#866E65]">Rejected</p>
                <p className="mt-2 text-[28px] font-semibold text-[#1E1310]">{loading ? "--" : stats.rejected}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] xl:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold">Pending Draft Reviews</h2>
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
                      <div key={idx} className="h-12 rounded-lg bg-gradient-to-r from-[#F4ECE7] via-[#FBF8F6] to-[#F4ECE7] bg-[length:200%_100%] animate-[shimmer_1.8s_infinite]" />
                    ))}
                  </div>
                ) : pendingDrafts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E4D8D1] bg-[#FBF8F5] p-8 text-center">
                    <Clock3 className="mx-auto text-[#C1AAA0]" size={24} />
                    <p className="mt-3 text-[15px] font-medium text-[#3A2A25]">No pending drafts - go generate some!</p>
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
                        <tr className="text-[12px] text-[#8A7268]">
                          <th className="py-2">Company Name</th>
                          <th className="py-2">Contact Email</th>
                          <th className="py-2">Date Generated</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingDrafts.slice(0, 8).map((draft) => (
                          <tr key={draft.id} className="border-t border-[#EFE5DE] text-[14px]">
                            <td className="py-3 font-medium">{draft.company_name}</td>
                            <td className="py-3 text-[#6F5A52]">{draft.contact_email}</td>
                            <td className="py-3 text-[#6F5A52]">{formatShortDate(draft.created_at)}</td>
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
                <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
                  <div className="inline-flex rounded-full bg-[#FCEBEA] px-2.5 py-1 text-[11px] font-medium text-[#A62927]">Coming Soon</div>
                  <h3 className="mt-3 text-[16px] font-semibold">AI Company Suggestions</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#6D5850]">
                    We&apos;ll recommend companies to cold email based on your profile. Coming soon.
                  </p>
                  <div className="mt-4 rounded-lg border border-dashed border-[#EADCD4] bg-[#FCF8F6] p-3 text-[12px] text-[#8A7268]">
                    Suggestions will appear here once this module launches.
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#E53935]" />
                    <h3 className="text-[16px] font-semibold">Onboarding Checklist</h3>
                  </div>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => router.push(item.ctaHref)}
                        className="flex w-full items-center gap-2 rounded-lg border border-[#EEE3DC] px-3 py-2 text-left text-[13px]"
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

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 text-[13px] text-[#6C5850]">
                <MailCheck size={16} className="mb-2 text-[#2E8B57]" />
                Accepted responses are manually tracked in Draft Review.
              </div>
              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 text-[13px] text-[#6C5850]">
                <MailX size={16} className="mb-2 text-[#9F5D3D]" />
                Mark rejected replies to improve your campaign analytics.
              </div>
              <div className="rounded-xl border border-[#E9DDD5] bg-white p-4 text-[13px] text-[#6C5850]">
                <Clock3 size={16} className="mb-2 text-[#7A6860]" />
                Review pending drafts daily for best outreach consistency.
              </div>
            </section>

            <section className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-semibold text-[#1E1310]">Email Workspace</h2>
                <button
                  onClick={() => void loadEmails()}
                  className="rounded-md border border-[#E4D8D1] px-3 py-1.5 text-[12px] text-[#4F3B34]"
                >
                  Refresh
                </button>
              </div>
              <div className="h-[560px] rounded-xl border border-[#EFE5DE] overflow-hidden">
                <DashboardEmails />
              </div>
            </section>
        </>
      </div>
    </div>
  );
}
