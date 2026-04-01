"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, FileUp, FolderOpen, GitFork, Loader2, Trash2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { DocumentRecord, formatShortDate, resolveDocumentStorageTarget } from "@/lib/coldstart";

type UploadPhase = "idle" | "uploading" | "done" | "error";

type UserFile = {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  uploaded_at: string;
};

type Project = {
  id: string;
  repo_name: string;
  description: string | null;
  summary: string | null;
  languages: string[];
  created_at: string;
};

export default function DocumentsPage() {
  const supabase = createClient();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadMessage, setUploadMessage] = useState("No files uploading.");

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSyncingProjects, setIsSyncingProjects] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").order("uploaded_at", { ascending: false });
    setDocuments((data ?? []) as DocumentRecord[]);
    setLoading(false);
  }, [supabase]);

  const loadUserFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/backend/files/list", { cache: "no-store" });
      if (res.ok) {
        const payload = (await res.json()) as { files: UserFile[] };
        setUserFiles(payload.files || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const res = await fetch("/api/backend/github/projects", { cache: "no-store" });
      let payload: { projects?: Project[]; error?: string; detail?: { message?: string } };
      try {
        payload = (await res.json()) as { projects?: Project[]; error?: string; detail?: { message?: string } };
      } catch {
        throw new Error("Server returned invalid response");
      }

      if (!res.ok || payload.error) {
        throw new Error(payload.detail?.message || payload.error || "Failed to load projects");
      }

      setProjects(payload.projects || []);
    } catch (error) {
      setProjects([]);
      setProjectsError(error instanceof Error ? error.message : "Failed to load projects");
    }
    setProjectsLoading(false);
  }, []);

  useEffect(() => {
    loadDocuments();
    loadUserFiles();
    loadProjects();
  }, [loadDocuments, loadUserFiles, loadProjects]);

  const handleUpload = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploadPhase("uploading");

      try {
        for (let index = 0; index < acceptedFiles.length; index += 1) {
          const file = acceptedFiles[index];
          setUploadMessage(`Uploading ${file.name} (${index + 1}/${acceptedFiles.length})`);

          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/backend/files/upload", {
            method: "POST",
            body: formData,
          });

          let payload: { success?: boolean; error?: string; detail?: { error?: string; message?: string } };
          try {
            payload = (await res.json()) as { success?: boolean; error?: string; detail?: { error?: string; message?: string } };
          } catch {
            throw new Error("Server returned invalid response");
          }

          if (!res.ok || payload.success === false) {
            const errorMsg = payload.error || payload.detail?.error || payload.detail?.message || "Upload failed";
            throw new Error(errorMsg);
          }
        }

        setUploadPhase("done");
        setUploadMessage("Upload complete.");
        await loadUserFiles();
        await loadDocuments();
      } catch (error) {
        setUploadPhase("error");
        setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
      }
    },
    [loadDocuments, loadUserFiles]
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

  const previewFile = async (doc: DocumentRecord) => {
    const { bucket, path } = resolveDocumentStorageTarget(doc);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const deleteFile = async (doc: DocumentRecord) => {
    const confirmed = window.confirm(`Delete ${doc.file_name}? This cannot be undone.`);
    if (!confirmed) return;

    const { bucket, path } = resolveDocumentStorageTarget(doc);
    await supabase.storage.from(bucket).remove([path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    await loadDocuments();
  };

  const handleSyncProjects = async () => {
    setIsSyncingProjects(true);
    setProjectsError(null);
    try {
      const res = await fetch("/api/backend/github/sync", { method: "POST" });
      let payload: { success?: boolean; error?: string; detail?: { message?: string } };
      try {
        payload = (await res.json()) as { success?: boolean; error?: string; detail?: { message?: string } };
      } catch {
        throw new Error("Server returned invalid response");
      }

      if (!res.ok) {
        throw new Error(payload?.detail?.message || payload?.error || "Failed to sync projects");
      }
      if (payload.success === false) {
        throw new Error(payload.error || payload.detail?.message || "Failed to sync projects");
      }

      await loadProjects();
      setUploadPhase("done");
      setUploadMessage("GitHub projects synced successfully.");
    } catch (error) {
      setUploadPhase("error");
      const message = error instanceof Error ? error.message : "Failed to sync projects.";
      setUploadMessage(message);
      setProjectsError(message);
    } finally {
      setIsSyncingProjects(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F5F3F0] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)] md:p-6">
          <h1 className="text-[22px] font-semibold text-[#1E1310]">My Documents</h1>
          <p className="mt-1 text-[14px] text-[#6F5A52]">Upload CSV and PDF files. PDFs are parsed and stored for draft generation.</p>
        </header>

        {/* File Upload Drop Zone */}
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
            {uploadPhase === "error" && (
              <span className="text-[#B42523] font-medium">{uploadMessage}</span>
            )}
            {uploadPhase === "done" && (
              <span className="text-[#2E8B57] font-medium">{uploadMessage}</span>
            )}
            {uploadPhase === "idle" && <span>{uploadMessage}</span>}
          </div>
        </section>

        {/* My Projects (GitHub Integration) */}
        <section className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitFork size={18} className="text-[#1E1310]" />
              <h2 className="text-[17px] font-semibold text-[#1E1310]">My Projects</h2>
            </div>
            <button
              onClick={handleSyncProjects}
              disabled={isSyncingProjects}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E1310] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
            >
              {isSyncingProjects ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {isSyncingProjects ? "Syncing..." : "Sync Projects"}
            </button>
          </div>
          <p className="mt-1 text-[13px] text-[#6F5A52]">
            Sync your GitHub repos. AI generates one-line summaries for each project.
          </p>

          <div className="mt-4">
            {projectsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-20 rounded-xl bg-gradient-to-r from-[#F4ECE7] via-[#FBF8F6] to-[#F4ECE7] bg-[length:200%_100%] animate-[shimmer_1.8s_infinite]" />
                ))}
              </div>
            ) : projectsError ? (
              <div className="rounded-xl border border-[#F1C8C6] bg-[#FDF3F3] p-6 text-center">
                <p className="text-[14px] font-medium text-[#B42523]">{projectsError}</p>
                <button
                  onClick={loadProjects}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#F1C8C6] px-3 py-1.5 text-[12px] font-medium text-[#B42523]"
                >
                  <RefreshCw size={13} /> Retry
                </button>
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E4D8D1] bg-[#FBF8F5] p-8 text-center">
                <GitFork className="mx-auto text-[#B89F95]" size={24} />
                <p className="mt-3 text-[14px] text-[#6F5A52]">No projects synced yet. Click &quot;Sync Projects&quot; to import from GitHub.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <div key={project.id} className="rounded-xl border border-[#EDE2DA] p-4 transition hover:shadow-md">
                    <p className="truncate text-[14px] font-semibold text-[#1E1310]">{project.repo_name}</p>
                    <p className="mt-1 text-[12px] text-[#6F5A52] line-clamp-2">
                      {project.summary || project.description || "No description"}
                    </p>
                    {project.languages && project.languages.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {project.languages.slice(0, 5).map((lang) => (
                          <span
                            key={lang}
                            className="rounded-full bg-[#FAF2ED] px-2.5 py-0.5 text-[11px] font-medium text-[#7A6158]"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Uploaded Files List */}
        {userFiles.length > 0 && (
          <section className="rounded-2xl border border-[#E9DDD5] bg-white p-5 shadow-[0_8px_24px_rgba(54,35,26,0.05)]">
            <h2 className="mb-3 text-[17px] font-semibold text-[#1E1310]">Uploaded Files</h2>
            <div className="space-y-2">
              {userFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-[#EDE2DA] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-[#2C1E1A]">{f.file_name}</p>
                    <p className="text-[12px] text-[#7B655D]">
                      {f.file_type.toUpperCase()} · {new Date(f.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase ${
                    f.file_type === "pdf" ? "bg-[#FCEBEB] text-[#B42523]" : "bg-[#EAF1FD] text-[#2F6FB7]"
                  }`}>
                    {f.file_type}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Legacy Document Files (from documents table) */}
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
