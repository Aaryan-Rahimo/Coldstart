"use client";

import { EmailDrawer } from "@/components/emails/EmailDrawer";
import { EmailTable } from "@/components/emails/EmailTable";
import { EmptyState } from "@/components/emails/EmptyState";
import { useEmailsStore } from "@/store/emails";

export function DashboardEmails() {
  const { emails } = useEmailsStore();
  const hasData = emails.length > 0;

  return (
    <div className="flex h-full flex-1 flex-col bg-[var(--color-bg)]">
      {hasData ? <EmailTable /> : <EmptyState />}
      <EmailDrawer />
    </div>
  );
}
