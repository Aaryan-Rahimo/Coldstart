'use client';

import React, { useEffect } from 'react';
import { useEmailsStore } from '@/store/emails';
import { EmptyState } from '@/components/emails/EmptyState';
import { EmailTable } from '@/components/emails/EmailTable';
import { EmailDrawer } from '@/components/emails/EmailDrawer';

export default function AppPage() {
  const { emails, setGenerating } = useEmailsStore();

  // Show table if there are emails, otherwise default empty state
  // But for this mockup, we'll start with data (from initial mock state)
  // Let's add an effect to demonstrate loading state when no emails
  
  const hasData = emails.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-bg)]">
      {hasData ? <EmailTable /> : <EmptyState />}
      <EmailDrawer />
    </div>
  );
}
