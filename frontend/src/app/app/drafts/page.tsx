"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Clipboard,
  Eye,
  FileSpreadsheet,
  Loader2,
  Mail,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase";
import { CsvPreviewRow, DraftRecord, DraftStatus, DocumentRecord, formatShortDate, resolveDocumentStorageTarget } from "@/lib/coldstart";

type PageTab = "generate" | "review";

type ColumnMapping = {
  companyName: string;
  contactEmail: string;
};

const STATUS_OPTIONS: Array<{ key: "all" | DraftStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

export default function DraftsPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<PageTab>((searchParams.get("tab") as PageTab) || "generate");
  const [statusFilter, setStatusFilter] = useState<"all" | DraftStatus>((searchParams.get("status") as "all" | DraftStatus) || "all");

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCsvId, setSelectedCsvId] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvPreviewRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ companyName: "", contactEmail: "" });
  const [selectedPdfIds, setSelectedPdfIds] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  const [activeDraft, setActiveDraft] = useState<DraftRecord | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const openDraft = useCallback((draft: DraftRecord) => {
    setActiveDraft(draft);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
    setPreviewMode(false);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);

    const [docsResult, draftsResult] = await Promise.all([
      supabase.from("documents").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("drafts").select("*").order("created_at", { ascending: false }),
    ]);

    const docs = (docsResult.data ?? []) as DocumentRecord[];
    const draftRows = (draftsResult.data ?? []) as DraftRecord[];

    setDocuments(docs);
    setDrafts(draftRows);

    const newestPdf = docs.find((doc) => doc.file_type === "pdf");
    if (newestPdf) {
      setSelectedPdfIds([newestPdf.id]);
    }

    const incomingDraftId = searchParams.get("draftId");
    if (incomingDraftId) {
      const target = draftRows.find((draft) => draft.id === incomingDraftId);
      if (target) {
        setTab("review");
        openDraft(target);
      }
    }

    setLoading(false);
  }, [openDraft, searchParams, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const csvFiles = useMemo(() => documents.filter((doc) => doc.file_type === "csv"), [documents]);
  const pdfFiles = useMemo(() => documents.filter((doc) => doc.file_type === "pdf"), [documents]);

  const filteredDrafts = useMemo(() => {
    if (statusFilter === "all") {
      return drafts;
    }
    return drafts.filter((draft) => draft.status === statusFilter);
  }, [drafts, statusFilter]);

  const updateQuery = (nextTab: PageTab, nextStatus?: "all" | DraftStatus) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    if (nextStatus) {
      params.set("status", nextStatus);
    }
    router.replace(`/app/drafts?${params.toString()}`);
  };

  const onSelectCsv = async (documentId: string) => {
    setSelectedCsvId(documentId);
    setSuccessMessage("");

    const target = csvFiles.find((doc) => doc.id === documentId);
    if (!target) return;

    const { bucket, path } = resolveDocumentStorageTarget(target);
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) {
      return;
    }

    const csvText = await data.text();
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    const rows = (parsed.data ?? []).map((row, idx) => ({
      id: `${documentId}-${idx}`,
      raw: row,
      selected: true,
    }));

    const headers = Object.keys(rows[0]?.raw ?? {}).filter(Boolean);
    const guessCompany = headers.find((header) => /company|organization|org|name/i.test(header)) || headers[0] || "";
    const guessEmail = headers.find((header) => /email|mail|contact/i.test(header)) || headers[1] || "";

    setCsvRows(rows);
    setCsvHeaders(headers);
    setMapping({ companyName: guessCompany, contactEmail: guessEmail });
  };

  const toggleRow = (id: string) => {
    setCsvRows((prev) => prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  };

  const togglePdf = (id: string) => {
    setSelectedPdfIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const generateDrafts = async () => {
    const selectedRows = csvRows.filter((row) => row.selected);
    const selectedPdfs = pdfFiles.filter((pdf) => selectedPdfIds.includes(pdf.id));

    if (selectedRows.length === 0 || !mapping.companyName || !mapping.contactEmail || selectedPdfs.length === 0) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const resumeText = selectedPdfs
      .map((pdf) => pdf.parsed_content ?? "")
      .join("\n\n")
      .slice(0, 15000);

    setIsGenerating(true);
    setGenerationProgress(0);
    setSuccessMessage("");

    const payload: Array<{
      user_id: string;
      company_name: string;
      contact_email: string;
      subject: string;
      body: string;
      status: DraftStatus;
    }> = [];

    for (let i = 0; i < selectedRows.length; i += 1) {
      const row = selectedRows[i];
      const companyName = row.raw[mapping.companyName] ?? "";
      const contactEmail = row.raw[mapping.contactEmail] ?? "";

      if (!companyName || !contactEmail) {
        continue;
      }

      const response = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, contactEmail, resumeText }),
      });

      if (response.ok) {
        const generated = (await response.json()) as { subject: string; body: string };
        payload.push({
          user_id: user.id,
          company_name: companyName,
          contact_email: contactEmail,
          subject: generated.subject,
          body: generated.body,
          status: "pending",
        });
      }

      setGenerationProgress(Math.round(((i + 1) / selectedRows.length) * 100));
    }

    if (payload.length > 0) {
      await supabase.from("drafts").insert(payload);
      await loadAll();
      setSuccessMessage(`Generated ${payload.length} draft${payload.length > 1 ? "s" : ""}.`);
    }

    setIsGenerating(false);
  };

  const saveDraft = async () => {
    if (!activeDraft) return;
    await supabase.from("drafts").update({ subject: editSubject, body: editBody }).eq("id", activeDraft.id);
    await loadAll();
    setActiveDraft((prev) => (prev ? { ...prev, subject: editSubject, body: editBody } : prev));
  };

  const updateStatus = async (status: DraftStatus) => {
    if (!activeDraft) return;
    await supabase.from("drafts").update({ status }).eq("id", activeDraft.id);
    await loadAll();
    setActiveDraft((prev) => (prev ? { ...prev, status } : prev));
  };

  const deleteDraft = async () => {
    if (!activeDraft) return;
    const confirmed = window.confirm("Delete this draft?");
    if (!confirmed) return;
    await supabase.from("drafts").delete().eq("id", activeDraft.id);
    setActiveDraft(null);
    await loadAll();
  };

  const copyDraft = async () => {
    await navigator.clipboard.writeText(`${editSubject}\n\n${editBody}`);
  };

  return (
    <div className="min-h-full bg-[#F5F3F0] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] md:p-6">
          <h1 className="text-[22px] font-semibold text-[#1E1310]">Drafts</h1>
          <p className="mt-1 text-[14px] text-[#6F5A52]">Generate and review AI drafts before sending.</p>
        </header>

        <div className="inline-flex rounded-xl border border-[#E6DBD2] bg-white p-1">
          <button
            className={`rounded-lg px-4 py-2 text-[13px] font-medium ${tab === "generate" ? "bg-[#FDECEC] text-[#C62A27]" : "text-[#725F57]"}`}
            onClick={() => {
              setTab("generate");
              updateQuery("generate");
            }}
          >
            Generate New Drafts
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-[13px] font-medium ${tab === "review" ? "bg-[#FDECEC] text-[#C62A27]" : "text-[#725F57]"}`}
            onClick={() => {
              setTab("review");
              updateQuery("review", statusFilter);
            }}
          >
            Review Drafts
          </button>
        </div>

        {tab === "generate" ? (
          <section className="space-y-5">
            <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
              <h2 className="text-[17px] font-semibold text-[#1E1310]">Step 1 - Select CSV</h2>
              <div className="mt-3">
                <select
                  value={selectedCsvId}
                  onChange={(event) => onSelectCsv(event.target.value)}
                  className="w-full rounded-lg border border-[#E1D6CF] bg-[#FFFEFD] px-3 py-2 text-[14px]"
                >
                  <option value="">Choose a CSV file</option>
                  {csvFiles.map((csv) => (
                    <option key={csv.id} value={csv.id}>
                      {csv.file_name} ({formatShortDate(csv.uploaded_at)})
                    </option>
                  ))}
                </select>
              </div>

              {csvHeaders.length > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-[13px] text-[#634F48]">
                    Company Name Column
                    <select
                      value={mapping.companyName}
                      onChange={(event) => setMapping((prev) => ({ ...prev, companyName: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#E1D6CF] bg-white px-3 py-2 text-[14px]"
                    >
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[13px] text-[#634F48]">
                    Contact Email Column
                    <select
                      value={mapping.contactEmail}
                      onChange={(event) => setMapping((prev) => ({ ...prev, contactEmail: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#E1D6CF] bg-white px-3 py-2 text-[14px]"
                    >
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {csvRows.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-[#E8DDD6]">
                  <table className="w-full min-w-[620px] text-left">
                    <thead className="bg-[#FBF7F4] text-[12px] text-[#8A7268]">
                      <tr>
                        <th className="px-3 py-2">Use</th>
                        <th className="px-3 py-2">Company Name</th>
                        <th className="px-3 py-2">Contact Email</th>
                        {csvHeaders
                          .filter((header) => header !== mapping.companyName && header !== mapping.contactEmail)
                          .slice(0, 2)
                          .map((header) => (
                            <th key={header} className="px-3 py-2">
                              {header}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row) => (
                        <tr key={row.id} className="border-t border-[#EFE5DE] text-[13px]">
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.id)} />
                          </td>
                          <td className="px-3 py-2">{row.raw[mapping.companyName]}</td>
                          <td className="px-3 py-2">{row.raw[mapping.contactEmail]}</td>
                          {csvHeaders
                            .filter((header) => header !== mapping.companyName && header !== mapping.contactEmail)
                            .slice(0, 2)
                            .map((header) => (
                              <td key={header} className="px-3 py-2">
                                {row.raw[header]}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
              <h2 className="text-[17px] font-semibold text-[#1E1310]">Step 2 - Select Experience Source</h2>
              <div className="mt-3 space-y-2">
                {pdfFiles.length === 0 && <p className="text-[14px] text-[#7A645C]">Upload a PDF first in My Documents.</p>}
                {pdfFiles.map((pdf) => (
                  <label key={pdf.id} className="flex items-center justify-between rounded-lg border border-[#E8DDD6] px-3 py-2">
                    <div>
                      <p className="text-[14px] font-medium text-[#2D211E]">{pdf.file_name}</p>
                      <p className="text-[12px] text-[#7D675E]">Uploaded {formatShortDate(pdf.uploaded_at)}</p>
                    </div>
                    <input type="checkbox" checked={selectedPdfIds.includes(pdf.id)} onChange={() => togglePdf(pdf.id)} />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 md:p-6">
              <h2 className="text-[17px] font-semibold text-[#1E1310]">Step 3 - Generate</h2>
              <p className="mt-2 text-[13px] text-[#6F5A52]">Drafts are generated one by one and stored with pending status.</p>

              <button
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E53935] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
                onClick={generateDrafts}
                disabled={isGenerating || csvRows.length === 0}
              >
                {isGenerating && <Loader2 size={14} className="animate-spin" />} Generate Drafts
              </button>

              {isGenerating && (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-[#F2E7E1]">
                    <div className="h-full bg-[#E53935] transition-all" style={{ width: `${generationProgress}%` }} />
                  </div>
                  <p className="mt-1 text-[12px] text-[#7E675E]">{generationProgress}% complete</p>
                </div>
              )}

              {successMessage && (
                <div className="mt-4 rounded-lg border border-[#D9EDDD] bg-[#F3FBF5] p-3 text-[13px] text-[#2D7A45]">
                  {successMessage}
                  <button
                    className="ml-3 rounded-md border border-[#9ED0AE] px-2 py-1 text-[12px]"
                    onClick={() => {
                      setTab("review");
                      updateQuery("review", "pending");
                      setStatusFilter("pending");
                    }}
                  >
                    Review Drafts
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[#E9DDD5] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setStatusFilter(option.key);
                      updateQuery("review", option.key);
                    }}
                    className={`rounded-full px-3 py-1.5 text-[12px] ${
                      statusFilter === option.key ? "bg-[#FDECEC] text-[#BC2624]" : "bg-[#F6F1ED] text-[#6F5A52]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E9DDD5] bg-white">
              <table className="w-full min-w-[880px] text-left">
                <thead className="bg-[#FBF7F4] text-[12px] text-[#8A7268]">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#7E675E]">
                        Loading drafts...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredDrafts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#7E675E]">
                        No drafts for this filter.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredDrafts.map((draft) => (
                      <tr
                        key={draft.id}
                        className="cursor-pointer border-t border-[#EFE5DE] text-[14px] hover:bg-[#FCF8F5]"
                        onClick={() => openDraft(draft)}
                      >
                        <td className="px-4 py-3 font-medium">{draft.company_name}</td>
                        <td className="px-4 py-3 text-[#6F5A52]">{draft.contact_email}</td>
                        <td className="px-4 py-3 text-[#6F5A52]">{draft.subject}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={draft.status} />
                        </td>
                        <td className="px-4 py-3 text-[#6F5A52]">{formatShortDate(draft.created_at)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {activeDraft && (
        <>
          <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setActiveDraft(null)} />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto border-l border-[#E8DDD6] bg-white p-5 shadow-2xl md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-wide text-[#8A7268]">Draft Detail</p>
                <h3 className="text-[18px] font-semibold text-[#1E1310]">{activeDraft.company_name}</h3>
              </div>
              <button onClick={() => setActiveDraft(null)} className="rounded-md p-1 text-[#7D675F] hover:bg-[#F4ECE7]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-[12px] text-[#7D675F]">
                Subject
                <input
                  value={editSubject}
                  onChange={(event) => setEditSubject(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px]"
                />
              </label>

              <div className="flex items-center justify-between">
                <p className="text-[12px] text-[#7D675F]">Body</p>
                <button
                  className="rounded-full border border-[#E2D7CF] px-2 py-1 text-[11px]"
                  onClick={() => setPreviewMode((prev) => !prev)}
                >
                  {previewMode ? "Raw" : "Preview"}
                </button>
              </div>

              {!previewMode ? (
                <textarea
                  value={editBody}
                  onChange={(event) => setEditBody(event.target.value)}
                  className="min-h-[230px] w-full rounded-lg border border-[#E1D6CF] px-3 py-2 text-[14px]"
                />
              ) : (
                <div className="min-h-[230px] rounded-lg border border-[#E1D6CF] bg-[#FFFEFD] p-4 text-[14px] leading-7 text-[#2B1D19]">
                  {editBody.split("\n").map((line, idx) => (
                    <p key={idx}>{line || <>&nbsp;</>}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E1D6CF] px-3 py-2 text-[12px]" onClick={saveDraft}>
                  <Pencil size={13} /> Save
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#D7E7DA] bg-[#F2FBF4] px-3 py-2 text-[12px] text-[#25673A]"
                  onClick={() => updateStatus("sent")}
                >
                  <Send size={13} /> Mark as Sent
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#D7E7DA] bg-[#F2FBF4] px-3 py-2 text-[12px] text-[#25673A]"
                  onClick={() => updateStatus("accepted")}
                >
                  <Check size={13} /> Mark Accepted
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#F1C8C6] bg-[#FDEEEE] px-3 py-2 text-[12px] text-[#B42523]"
                  onClick={() => updateStatus("rejected")}
                >
                  <X size={13} /> Mark Rejected
                </button>
                <button className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#E1D6CF] px-3 py-2 text-[12px]" onClick={copyDraft}>
                  <Clipboard size={13} /> Copy
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#F1C8C6] px-3 py-2 text-[12px] text-[#B42523]"
                  onClick={deleteDraft}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              <div className="rounded-lg border border-[#E8DDD6] bg-[#FCF8F5] p-3 text-[12px] text-[#715D55]">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} />
                  Generated on {formatShortDate(activeDraft.created_at)}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Mail size={14} />
                  {activeDraft.contact_email}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Eye size={14} />
                  Status: {activeDraft.status}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DraftStatus }) {
  const styleMap: Record<DraftStatus, string> = {
    pending: "bg-[#FFF4E8] text-[#A8692A]",
    sent: "bg-[#E8F7ED] text-[#2C7A42]",
    accepted: "bg-[#E6F4EB] text-[#2B7E4A]",
    rejected: "bg-[#FDECEC] text-[#B42523]",
  };

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase ${styleMap[status]}`}>{status}</span>;
}
