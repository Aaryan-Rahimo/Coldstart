export type DraftStatus = "pending" | "sent" | "accepted" | "rejected";

export interface DocumentRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_type: "pdf" | "csv";
  storage_path: string;
  parsed_content: string | null;
  uploaded_at: string;
}

export interface DraftRecord {
  id: string;
  user_id: string;
  company_name: string;
  contact_email: string;
  subject: string;
  body: string;
  status: DraftStatus;
  created_at: string;
}

export interface CsvPreviewRow {
  id: string;
  raw: Record<string, string>;
  selected: boolean;
}

export function resolveDocumentStorageTarget(doc: Pick<DocumentRecord, "file_type" | "storage_path">): {
  bucket: string;
  path: string;
} {
  const [maybeBucket, ...rest] = doc.storage_path.split(":");
  if (rest.length > 0) {
    return {
      bucket: maybeBucket,
      path: rest.join(":"),
    };
  }

  if (doc.file_type === "csv") {
    return { bucket: "csvs", path: doc.storage_path };
  }

  if (doc.file_type === "pdf") {
    return { bucket: "pdfs", path: doc.storage_path };
  }

  return { bucket: "documents", path: doc.storage_path };
}

export function getGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatLongDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getDisplayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    return name.trim();
  }
  if (email && email.includes("@")) {
    const [prefix] = email.split("@");
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return "there";
}

export function truncateUserId(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
