"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, FileUp, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { DocumentRecord, formatShortDate, resolveDocumentStorageTarget } from "@/lib/coldstart";
import { useEmailsStore } from "@/store/emails";

type UploadPhase = "idle" | "uploading" | "done" | "error";

async function extractPdfTextClient(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerSource = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = workerSource;

  const bytes = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    const line = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();
    if (line) parts.push(line);
  }

  return parts.join("\n").slice(0, 50000);
}

type UploadPdfResponse = {
  summary: string;
  file_id: string;
};

type GithubSummaryResponse = {
  summary: string;
};

export default function DocumentsPage() {
  const supabase = createClient();
  const loadEmails = useEmailsStore((state) => state.loadEmails);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadMessage, setUploadMessage] = useState("No files uploading.");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubSummary, setGithubSummary] = useState("");
  const [isSummarizingGithub, setIsSummarizingGithub] = useState(false);
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").order("uploaded_at", { ascending: false });
    setDocuments((data ?? []) as DocumentRecord[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        setUploadPhase("error");
        setUploadMessage("You must be logged in to upload files.");
        return;
      }

      setUploadPhase("uploading");

      try {
        for (let index = 0; index < acceptedFiles.length; index += 1) {
          const file = acceptedFiles[index];
          const extension = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "csv";
          const storagePath = `${userId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
          const bucket = extension === "pdf" ? "pdfs" : "csvs";
          const contentType = extension === "pdf" ? "application/pdf" : "text/csv";
          const fileType = extension === "pdf" ? "resume" : "csv";

          setUploadMessage(`Uploading ${file.name} (${index + 1}/${acceptedFiles.length})`);

          const uploadResult = await supabase.storage.from(bucket).upload(storagePath, file, {
            contentType,
            upsert: true,
          });
          if (uploadResult.error) {
            throw uploadResult.error;
          }

          const uploadedPath = uploadResult.data.path;

          const filesUpsertResult = await supabase.from("files").upsert({
            user_id: userId,
            file_type: fileType,
            file_url: uploadedPath,
          });

          if (filesUpsertResult.error) {
            throw filesUpsertResult.error;
          }

          let parsedContent: string | null = null;
          if (extension === "pdf") {
            const form = new FormData();
            form.append("file", file);
            const summaryRes = await fetch("/api/backend/upload-pdf", {
              method: "POST",
              body: form,
            });

            if (summaryRes.ok) {
              const summaryPayload = (await summaryRes.json()) as UploadPdfResponse;
              parsedContent = summaryPayload.summary;
            } else {
              parsedContent = await extractPdfTextClient(file);
            }
          }

          if (extension === "csv") {
            parsedContent = await file.text();
          }

          const insertResult = await supabase.from("documents").insert({
            user_id: userId,
            file_name: file.name,
            file_type: extension,
            uploaded_at: new Date().toISOString(),
            storage_path: `${bucket}:${uploadedPath}`,
            parsed_content: parsedContent,
          });

          if (insertResult.error) {
            throw insertResult.error;
          }
        }

        setUploadPhase("done");
        setUploadMessage("Upload complete.");
        await loadDocuments();
      } catch (error) {
        setUploadPhase("error");
        setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
      }
    },
    [loadDocuments, supabase]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
    },
    multiple: true,
    onDrop: handleUpload,
  });

  const pdfDocuments = useMemo(() => documents.filter((doc) => doc.file_type === "pdf"), [documents]);
  const csvDocuments = useMemo(() => documents.filter((doc) => doc.file_type === "csv"), [documents]);

  const latestResumeSummary = useMemo(() => {
    return pdfDocuments.find((doc) => Boolean(doc.parsed_content))?.parsed_content ?? null;
  }, [pdfDocuments]);

  const latestCsvData = useMemo(() => {
    return csvDocuments.find((doc) => Boolean(doc.parsed_content))?.parsed_content ?? null;
  }, [csvDocuments]);

  const handleGenerateGithubSummary = async () => {
    if (!githubUrl.trim()) {
      setUploadPhase("error");
      setUploadMessage("Enter a GitHub URL before generating summary.");
      return;
    }

    setIsSummarizingGithub(true);
    try {
      const res = await fetch("/api/backend/github-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: githubUrl.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate GitHub summary");
      }

      const payload = (await res.json()) as GithubSummaryResponse;
      setGithubSummary(payload.summary);
    } catch (error) {
      setUploadPhase("error");
      setUploadMessage(error instanceof Error ? error.message : "Failed to generate GitHub summary.");
    } finally {
      setIsSummarizingGithub(false);
    }
  };

  const handleGenerateEmails = async () => {
    if (!latestResumeSummary) {
      setUploadPhase("error");
      setUploadMessage("Upload a PDF resume first so we can build resume_summary.");
      return;
    }

    if (!latestCsvData) {
      setUploadPhase("error");
      setUploadMessage("Upload a CSV file first so we can generate outreach emails.");
      return;
    }

    setIsGeneratingEmails(true);
    try {
      const res = await fetch("/api/backend/generate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv_data: latestCsvData,
          resume_summary: latestResumeSummary,
          github_summary: githubSummary || null,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.detail?.message ?? "Failed to generate emails");
      }

      await loadEmails();
      setUploadPhase("done");
      setUploadMessage("Generated drafts successfully. Open the dashboard email table to review/send.");
    } catch (error) {
      setUploadPhase("error");
      setUploadMessage(error instanceof Error ? error.message : "Failed to generate emails.");
    } finally {
      setIsGeneratingEmails(false);
    }
  };

  const previewFile = async (doc: DocumentRecord) => {
    const { bucket, path } = resolveDocumentStorageTarget(doc);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
    if (error || !data?.signedUrl) {
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const deleteFile = async (doc: DocumentRecord) => {
    const confirmed = window.confirm(`Delete ${doc.file_name}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const { bucket, path } = resolveDocumentStorageTarget(doc);
    await supabase.storage.from(bucket).remove([path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    await loadDocuments();
  };

  return (
    <div className="min-h-full bg-[#F5F3F0] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] md:p-6">
          <h1 className="text-[22px] font-semibold text-[#1E1310]">My Documents</h1>
          <p className="mt-1 text-[14px] text-[#6F5A52]">Upload CSV and PDF files. PDFs are parsed and stored for draft generation.</p>
        </header>

        <section
          {...getRootProps()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
            isDragActive ? "border-[#E53935] bg-[#FFF4F3]" : "border-[#E2D7CF] bg-white"
          }`}
        >
          <input {...getInputProps()} />
          <FileUp className="mx-auto text-[#E53935]" size={26} />
          <p className="mt-3 text-[16px] font-medium text-[#2A1C19]">Drag and drop files here</p>
          <p className="mt-1 text-[13px] text-[#7E675E]">Accepts .csv and .pdf files</p>
          <button className="mt-4 rounded-lg bg-[#E53935] px-4 py-2 text-[13px] font-medium text-white">Choose Files</button>

          <div className="mt-4 text-[12px] text-[#7E675E]">
            {uploadPhase === "uploading" && (
              <span className="inline-flex items-center gap-2 text-[#B42523]">
                <Loader2 size={14} className="animate-spin" />
                {uploadMessage}
              </span>
            )}
            {uploadPhase !== "uploading" && <span>{uploadMessage}</span>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
          <h2 className="text-[17px] font-semibold text-[#1E1310]">Backend AI Actions</h2>
          <p className="mt-1 text-[13px] text-[#6F5A52]">Use backend endpoints to summarize GitHub and generate drafts from your latest uploaded CSV + resume summary.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input
              type="url"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder="https://github.com/your-handle"
              className="h-10 rounded-lg border border-[#E2D7CF] px-3 text-[14px] outline-none focus:border-[#E53935]"
            />
            <button
              onClick={handleGenerateGithubSummary}
              disabled={isSummarizingGithub}
              className="rounded-lg bg-[#E53935] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
            >
              {isSummarizingGithub ? "Summarizing..." : "Generate GitHub Summary"}
            </button>
          </div>

          {githubSummary && (
            <p className="mt-3 rounded-lg border border-[#E9DDD5] bg-[#FCF8F6] p-3 text-[13px] text-[#473632]">
              {githubSummary}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleGenerateEmails}
              disabled={isGeneratingEmails}
              className="rounded-lg bg-[#1E1310] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
            >
              {isGeneratingEmails ? "Generating..." : "Generate Emails From Latest CSV"}
            </button>
            <span className="text-[12px] text-[#7E675E]">Requires one uploaded PDF and one uploaded CSV.</span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <DocumentColumn
            title="Resumes & PDFs"
            icon={<FileText size={16} className="text-[#E53935]" />}
            documents={pdfDocuments}
            loading={loading}
            onPreview={previewFile}
            onDelete={deleteFile}
            badgeClass="bg-[#FCEBEB] text-[#B42523]"
          />

          <DocumentColumn
            title="CSV Files"
            icon={<FolderOpen size={16} className="text-[#2F6FB7]" />}
            documents={csvDocuments}
            loading={loading}
            onPreview={previewFile}
            onDelete={deleteFile}
            badgeClass="bg-[#EAF1FD] text-[#2F6FB7]"
          />
        </section>
      </div>
    </div>
  );
}

function DocumentColumn({
  title,
  icon,
  documents,
  loading,
  onPreview,
  onDelete,
  badgeClass,
}: {
  title: string;
  icon: React.ReactNode;
  documents: DocumentRecord[];
  loading: boolean;
  onPreview: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
  badgeClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-[17px] font-semibold text-[#1E1310]">{title}</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-20 rounded-xl bg-gradient-to-r from-[#F4ECE7] via-[#FBF8F6] to-[#F4ECE7] bg-[length:200%_100%] animate-[shimmer_1.8s_infinite]" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E4D8D1] bg-[#FBF8F5] p-8 text-center">
          <FileText className="mx-auto text-[#B89F95]" size={24} />
          <p className="mt-3 text-[14px] text-[#6F5A52]">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-[#EDE2DA] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-[#2C1E1A]">{doc.file_name}</p>
                  <p className="mt-1 text-[12px] text-[#7B655D]">Uploaded {formatShortDate(doc.uploaded_at)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase ${badgeClass}`}>{doc.file_type}</span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  className="rounded-md border border-[#E2D7CF] px-3 py-1.5 text-[12px] text-[#4F3B34]"
                  onClick={() => onPreview(doc)}
                >
                  Preview
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-md border border-[#F1C8C6] px-3 py-1.5 text-[12px] text-[#B42523]"
                  onClick={() => onDelete(doc)}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
