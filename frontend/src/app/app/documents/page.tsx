"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ChevronLeft, ChevronRight, FileText, FileUp, FolderOpen, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Document, formatShortDate, resolveDocumentStorageTarget } from "@/lib/coldstart";

type UploadPhase = "idle" | "uploading" | "done" | "error";

type Project = {
  repo_name: string;
  summary: string;
  language: string;
  languages: string[];
  stars: number;
  github_url: string;
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  Python: "#3776AB",
  Rust: "#CE422B",
  Go: "#00ADD8",
  Java: "#ED8B00",
  CSS: "#563D7C",
  HTML: "#E34F26",
  Swift: "#FA7343",
  Kotlin: "#7F52FF",
};

// ── Delete confirmation modal ─────────────────────────────────
function DeleteModal({
  file,
  isDark,
  onConfirm,
  onCancel,
}: {
  file: Document;
  isDark: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDEEEE]">
            <Trash2 size={16} className="text-[#B42523]" />
          </div>
          <h3 className={`text-[16px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Delete file?</h3>
        </div>
        <p className={`text-[13px] leading-5 ${isDark ? "text-[#B09898]" : "text-[#6F5A52]"}`}>
          <span className="font-medium">{file.file_name}</span> will be permanently deleted. This cannot be undone.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className={`rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors ${isDark ? "border-[#3A3030] text-[#D8CACA] hover:bg-[#252020]" : "border-[#E2D7CF] text-[#4F3B34] hover:bg-[#F7F2EF]"}`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-[#B42523] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#9A1F1D] transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview overlay ───────────────────────────────────────────
function PreviewOverlay({
  file,
  allFiles,
  signedUrl,
  isDark,
  onClose,
  onNavigate,
  onDelete,
}: {
  file: Document;
  allFiles: Document[];
  signedUrl: string;
  isDark: boolean;
  onClose: () => void;
  onNavigate: (file: Document) => void;
  onDelete: (file: Document) => void;
}) {
  const currentIndex = allFiles.findIndex((f) => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;
  const isPdf = file.file_type.toLowerCase() === "pdf";

  // Close on Escape, navigate with arrows
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(allFiles[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(allFiles[currentIndex + 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, hasPrev, hasNext, allFiles, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      {/* Card — 80% of screen */}
      <div
        className={`flex w-[90%] max-w-7xl h-[82vh] rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left sidebar: file list ── */}
        <div className={`flex w-64 shrink-0 flex-col border-r ${isDark ? "border-[#2E2626] bg-[#181313]" : "border-[#EDE2DA] bg-[#FAF7F5]"}`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-[#2E2626]" : "border-[#EDE2DA]"}`}>
            <span className={`text-[12px] font-semibold uppercase tracking-wider ${isDark ? "text-[#6B5555]" : "text-[#A08880]"}`}>Files</span>
            <span className={`text-[11px] ${isDark ? "text-[#6B5555]" : "text-[#A08880]"}`}>{allFiles.length}</span>
          </div>

          {/* Scrollable file list — sorted by type */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {(() => {
              const pdfFiles = allFiles.filter((f) => f.file_type.toLowerCase() === "pdf");
              const csvFiles = allFiles.filter((f) => f.file_type.toLowerCase() === "csv");
              const groups = [
                { label: "PDF Files", files: pdfFiles },
                { label: "CSV Files", files: csvFiles },
              ].filter((g) => g.files.length > 0);

              return groups.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className={`px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-[#4A3838]" : "text-[#BCA89F]"}`}>
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.files.map((f) => {
              const isActive = f.id === file.id;
              const fIsPdf = f.file_type.toLowerCase() === "pdf";
              return (
                <button
                  key={f.id}
                  onClick={() => onNavigate(f)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                    isActive
                      ? isDark
                        ? "bg-[#2E2222] border border-[#E53935]/30"
                        : "bg-[#FFF4F3] border border-[#E53935]/20"
                      : isDark
                      ? "hover:bg-[#252020] border border-transparent"
                      : "hover:bg-[#F5F0EC] border border-transparent"
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${fIsPdf ? "bg-[#FDEEEE]" : "bg-[#EEF3FB]"}`}>
                    {fIsPdf
                      ? <FileText size={14} className="text-[#E53935]" />
                      : <FolderOpen size={14} className="text-[#2F6FB7]" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-medium ${isActive ? (isDark ? "text-[#F5EFEF]" : "text-[#1E1310]") : isDark ? "text-[#D8CACA]" : "text-[#4F3B34]"}`}>
                      {f.file_name}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isDark ? "text-[#6B5555]" : "text-[#A08880]"}`}>
                      {f.file_type.toUpperCase()} · {formatShortDate(f.uploaded_at)}
                    </p>
                  </div>
                </button>
                    );
                  })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* ── Right panel: preview content ── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${isDark ? "border-[#2E2626]" : "border-[#EDE2DA]"}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isPdf ? "bg-[#FDEEEE]" : "bg-[#EEF3FB]"}`}>
                {isPdf
                  ? <FileText size={15} className="text-[#E53935]" />
                  : <FolderOpen size={15} className="text-[#2F6FB7]" />
                }
              </div>
              <div className="min-w-0">
                <p className={`truncate text-[14px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>{file.file_name}</p>
                <p className={`text-[11px] ${isDark ? "text-[#6B5555]" : "text-[#A08880]"}`}>
                  {file.file_type.toUpperCase()} · {formatShortDate(file.uploaded_at)} · {currentIndex + 1} of {allFiles.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Prev / Next */}
              <button
                onClick={() => hasPrev && onNavigate(allFiles[currentIndex - 1])}
                disabled={!hasPrev}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 ${isDark ? "border-[#3A3030] text-[#D8CACA] hover:bg-[#252020]" : "border-[#E2D7CF] text-[#4F3B34] hover:bg-[#F7F2EF]"}`}
                title="Previous file"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => hasNext && onNavigate(allFiles[currentIndex + 1])}
                disabled={!hasNext}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 ${isDark ? "border-[#3A3030] text-[#D8CACA] hover:bg-[#252020]" : "border-[#E2D7CF] text-[#4F3B34] hover:bg-[#F7F2EF]"}`}
                title="Next file"
              >
                <ChevronRight size={16} />
              </button>

              {/* Delete */}
              <button
                onClick={() => { onDelete(file); onClose(); }}
                className="flex items-center gap-1.5 rounded-lg border border-[#F1C8C6] px-3 py-1.5 text-[12px] font-medium text-[#B42523] hover:bg-[#FFF5F5] transition-colors"
                title="Delete this file"
              >
                <Trash2 size={13} /> Delete
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isDark ? "hover:bg-[#252020] text-[#B09898]" : "hover:bg-[#F5F0EC] text-[#6F5A52]"}`}
                title="Close preview"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className={`flex-1 overflow-hidden ${isPdf ? "" : isDark ? "bg-[#181313]" : "bg-[#FAF7F5]"}`}>
            {isPdf ? (
              <iframe
                src={`${signedUrl}#toolbar=1&navpanes=0`}
                className="h-full w-full border-none"
                title={file.file_name}
              />
            ) : (
              <CsvPreview signedUrl={signedUrl} isDark={isDark} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CSV table preview ─────────────────────────────────────────
function CsvPreview({ signedUrl, isDark }: { signedUrl: string; isDark: boolean }) {
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCsv() {
      try {
        const res = await fetch(signedUrl);
        const text = await res.text();
        const parsed = text
          .trim()
          .split("\n")
          .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
        setRows(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load CSV");
      } finally {
        setLoading(false);
      }
    }
    fetchCsv();
  }, [signedUrl]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#E53935]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[#E53935] text-[14px]">{error}</p>
      </div>
    );
  }

  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1);

  return (
    <div className="h-full overflow-auto p-6">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`border px-3 py-2 text-left font-semibold ${isDark ? "border-[#2E2626] bg-[#1C1717] text-[#F5EFEF]" : "border-[#E2D7CF] bg-[#F7F2EF] text-[#1E1310]"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`border px-3 py-2 ${isDark ? "border-[#2E2626] text-[#D8CACA]" : "border-[#E2D7CF] text-[#3D2C27]"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function DocumentsPage() {
  const [files, setFiles] = useState<Document[]>([]);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadMessage, setUploadMessage] = useState("No files uploading.");
  const [isDark, setIsDark] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Delete modal state
  const [fileToDelete, setFileToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    setIsDark(dark);
  }, []);

  const loadFiles = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch("/api/backend/files/list", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const text = await res.text();
      if (!text.trim()) { setFiles([]); return; }
      const payload = JSON.parse(text) as { success?: boolean; files?: Document[] };
      setFiles(payload.success ? (payload.files || []) : []);
    } catch {
      setFiles([]);
    }
  }, []);

  const handleUpload = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploadPhase("uploading");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setUploadPhase("error");
      setUploadMessage("Not authenticated. Please log in again.");
      return;
    }

    for (let index = 0; index < acceptedFiles.length; index++) {
      const file = acceptedFiles[index];
      setUploadMessage(`Uploading ${file.name} (${index + 1}/${acceptedFiles.length})`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/backend/files/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        const text = await res.text();
        if (!text.trim()) {
          setUploadPhase("error");
          setUploadMessage("Server returned empty response.");
          return;
        }

        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(text); } catch {
          setUploadPhase("error");
          setUploadMessage(`Server error: ${text.slice(0, 100)}`);
          return;
        }

        if (!res.ok || !payload.success) {
          setUploadPhase("error");
          setUploadMessage((payload.error as string) || "Upload failed");
          return;
        }
      } catch (error) {
        setUploadPhase("error");
        setUploadMessage(error instanceof Error ? error.message : "Upload failed");
        return;
      }
    }

    setUploadPhase("done");
    setUploadMessage("Upload complete.");
    await loadFiles();
  }, [loadFiles]);

  // Delete via backend API — fixes the storage + DB delete issue
  const confirmDelete = useCallback(async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setIsDeleting(false);
      setFileToDelete(null);
      return;
    }

    try {
      const res = await fetch(`/api/backend/files/${fileToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const text = await res.text();
      let payload: Record<string, unknown> = {};
      try { payload = JSON.parse(text); } catch { /* ignore */ }

      if (res.ok && payload.success !== false) {
        // Optimistically remove from local state immediately
        setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
        // Then refresh from server to confirm
        await loadFiles();
      } else {
        console.error("Delete failed:", payload.error);
      }
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  }, [fileToDelete, loadFiles]);

  // Open preview overlay
  const openPreview = useCallback(async (file: Document) => {
    setPreviewLoading(true);
    setPreviewFile(file);

    const supabase = createClient();
    const { bucket, path } = resolveDocumentStorageTarget(file);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);

    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL:", error);
      setPreviewFile(null);
      setPreviewLoading(false);
      return;
    }

    setPreviewUrl(data.signedUrl);
    setPreviewLoading(false);
  }, []);

  // Navigate between files in preview
  const navigatePreview = useCallback(async (file: Document) => {
    await openPreview(file);
  }, [openPreview]);

  const syncProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      console.error("SYNC: No session or access_token");
      setProjectsError("Not authenticated. Please log in again.");
      setProjectsLoading(false);
      return;
    }

    console.log("SYNC: token:", session.access_token.slice(0, 20) + "...");

    try {
      const res = await fetch("/api/backend/github/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("SYNC: status:", res.status);
      const text = await res.text();
      console.log("SYNC: raw response:", text.slice(0, 300));

      if (!text.trim()) {
        setProjectsError("Server returned empty response");
        return;
      }

      const payload = JSON.parse(text) as { success?: boolean; projects?: Project[]; error?: string; message?: string };
      console.log("SYNC: payload:", payload);

      if (payload.success) {
        setProjects(payload.projects || []);
        setProjectsError(null);
      } else {
        setProjectsError(payload.error || "Sync failed");
      }
    } catch (e) {
      console.error("SYNC: exception:", e);
      setProjectsError(e instanceof Error ? e.message : "Failed to sync");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch("/api/backend/github/projects", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const text = await res.text();
        if (!text.trim()) return;
        const payload = JSON.parse(text) as { success?: boolean; projects?: Project[] };
        if (payload.success) setProjects(payload.projects || []);
      } catch { /* ignore */ }
    }
    loadProjects();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "text/comma-separated-values": [".csv"],
    },
    multiple: true,
    onDrop: handleUpload,
  });

  const pdfFiles = useMemo(() => files.filter((f) => f.file_type.toLowerCase() === "pdf"), [files]);
  const csvFiles = useMemo(() => files.filter((f) => f.file_type.toLowerCase() === "csv"), [files]);

  return (
    <div className={`min-h-full px-5 py-6 md:px-8 md:py-8 ${isDark ? "bg-[#120F0F]" : "bg-[#F5F3F0]"}`}>
      <div className="mx-auto w-full max-w-6xl space-y-6">

        <header className={`rounded-2xl border p-5 md:p-6 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
          <h1 className={`text-[22px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>My Documents</h1>
          <p className={`mt-1 text-[14px] ${isDark ? "text-[#B09898]" : "text-[#6F5A52]"}`}>Upload CSV and PDF files. PDFs are parsed for email generation.</p>
        </header>

        {/* Upload dropzone */}
        <section
          {...getRootProps()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? "border-[#E53935] bg-[#FFF4F3]"
              : isDark
              ? "border-[#2E2626] bg-[#1C1717] hover:border-[#3A3030]"
              : "border-[#E2D7CF] bg-white hover:border-[#C9B5AA]"
          }`}
        >
          <input {...getInputProps()} />
          <FileUp className="mx-auto text-[#E53935]" size={26} />
          <p className={`mt-3 text-[16px] font-medium ${isDark ? "text-[#F5EFEF]" : "text-[#2A1C19]"}`}>
            Drag and drop files here
          </p>
          <p className={`mt-1 text-[13px] ${isDark ? "text-[#B09898]" : "text-[#7E675E]"}`}>
            Accepts .csv and .pdf files
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-[#E53935] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#C82E2B] transition-colors"
          >
            Choose Files
          </button>
          <div className={`mt-4 text-[12px] ${isDark ? "text-[#B09898]" : "text-[#7E675E]"}`}>
            {uploadPhase === "uploading" && (
              <span className="inline-flex items-center gap-2 text-[#B42523]">
                <Loader2 size={14} className="animate-spin" /> {uploadMessage}
              </span>
            )}
            {uploadPhase === "error" && <span className="text-[#B42523] font-medium">{uploadMessage}</span>}
            {uploadPhase === "done" && <span className="text-[#2E8B57] font-medium">{uploadMessage}</span>}
            {uploadPhase === "idle" && <span>{uploadMessage}</span>}
          </div>
        </section>

        {/* My Projects */}
        <section className={`rounded-2xl border p-5 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-[17px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>My Projects</h2>
            <button
              onClick={syncProjects}
              disabled={projectsLoading}
              className="flex items-center gap-2 bg-[#1A1210] text-white text-[13px] font-semibold rounded-full px-4 py-1.5 hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {projectsLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <RefreshCw size={12} />
              }
              Sync Projects
            </button>
          </div>

          {projectsError && (
            <div className={`mb-3 rounded-lg border px-3 py-2 text-[13px] ${isDark ? "border-[#3A1A1A] bg-[#1F1010] text-[#E87878]" : "border-[#F5CECE] bg-[#FFF5F5] text-[#B42523]"}`}>
              {projectsError}
            </div>
          )}

          {projects.length === 0 && !projectsLoading && !projectsError && (
            <p className={`text-[14px] ${isDark ? "text-[#B09898]" : "text-[#A08880]"}`}>
              No projects yet. Press Sync Projects to load your GitHub repos.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <a
                key={project.repo_name}
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block p-4 rounded-xl border transition-all ${isDark ? "border-[#2E2626] bg-[#252020] hover:border-[#D94048]" : "border-[#EBE0DC] bg-white hover:border-[#D94048] hover:shadow-sm"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold truncate ${isDark ? "text-[#F5EFEF]" : "text-[#1A1210]"}`}>
                      {project.repo_name}
                    </p>
                    <p className={`text-[12px] mt-0.5 line-clamp-2 ${isDark ? "text-[#B09898]" : "text-[#5C4A46]"}`}>
                      {project.summary}
                    </p>
                  </div>
                  {project.stars > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-[#A08880] shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      {project.stars}
                    </span>
                  )}
                </div>
                {project.languages && project.languages.filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {project.languages.filter(Boolean).map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: (LANGUAGE_COLORS[lang] || "#888888") + "18",
                          borderColor: (LANGUAGE_COLORS[lang] || "#888888") + "40",
                          color: LANGUAGE_COLORS[lang] || "#888888",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[lang] || "#888888" }} />
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>

        {/* PDF and CSV file columns */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <FileColumn
            title="PDF Files"
            icon={<FileText size={16} className="text-[#E53935]" />}
            files={pdfFiles}
            isDark={isDark}
            onPreview={openPreview}
            onDelete={(file) => setFileToDelete(file)}
          />
          <FileColumn
            title="CSV Files"
            icon={<FolderOpen size={16} className="text-[#2F6FB7]" />}
            files={csvFiles}
            isDark={isDark}
            onPreview={openPreview}
            onDelete={(file) => setFileToDelete(file)}
          />
        </section>
      </div>

      {/* Delete confirmation modal */}
      {fileToDelete && (
        <DeleteModal
          file={fileToDelete}
          isDark={isDark}
          onConfirm={confirmDelete}
          onCancel={() => setFileToDelete(null)}
        />
      )}
      {isDeleting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className={`flex items-center gap-3 rounded-xl px-6 py-4 ${isDark ? "bg-[#1C1717]" : "bg-white"}`}>
            <Loader2 size={18} className="animate-spin text-[#E53935]" />
            <span className={`text-[14px] font-medium ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>Deleting...</span>
          </div>
        </div>
      )}

      {/* Preview overlay */}
      {previewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
      )}
      {previewFile && previewUrl && !previewLoading && (
        <PreviewOverlay
          file={previewFile}
          allFiles={files}
          signedUrl={previewUrl}
          isDark={isDark}
          onClose={() => { setPreviewFile(null); setPreviewUrl(""); }}
          onNavigate={navigatePreview}
          onDelete={(file) => setFileToDelete(file)}
        />
      )}
    </div>
  );
}

function FileColumn({
  title,
  icon,
  files,
  isDark,
  onPreview,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  files: Document[];
  isDark: boolean;
  onPreview: (file: Document) => void;
  onDelete: (file: Document) => void;
}) {
  return (
    <section className={`rounded-2xl border p-5 ${isDark ? "bg-[#1C1717] border-[#2E2626]" : "bg-white border-[#E9DDD5]"}`}>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className={`text-[17px] font-semibold ${isDark ? "text-[#F5EFEF]" : "text-[#1E1310]"}`}>{title}</h2>
      </div>

      {files.length === 0 ? (
        <p className={`text-[14px] ${isDark ? "text-[#B09898]" : "text-[#A08880]"}`}>No files available.</p>
      ) : (
        <div className="space-y-3">
          {files.map((f) => (
            <div
              key={f.id}
              className={`rounded-xl border p-4 ${isDark ? "border-[#2E2626] bg-[#252020]" : "border-[#EDE2DA] bg-white"}`}
            >
              <div className="min-w-0">
                <p className={`truncate text-[14px] font-medium ${isDark ? "text-[#F5EFEF]" : "text-[#2C1E1A]"}`}>
                  {f.file_name}
                </p>
                <p className={`mt-1 text-[12px] ${isDark ? "text-[#B09898]" : "text-[#7B655D]"}`}>
                  Uploaded {formatShortDate(f.uploaded_at)}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${isDark ? "border-[#3B3232] text-[#D8CACA] hover:bg-[#2E2626]" : "border-[#E2D7CF] text-[#4F3B34] hover:bg-[#F7F2EF]"}`}
                  onClick={() => onPreview(f)}
                >
                  Preview
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-md border border-[#F1C8C6] px-3 py-1.5 text-[12px] font-medium text-[#B42523] hover:bg-[#FFF5F5] transition-colors"
                  onClick={() => onDelete(f)}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
