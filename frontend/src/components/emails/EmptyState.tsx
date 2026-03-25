'use client';

import React from 'react';
import { MailPlus } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center animate-fade-in-up px-6">
      <MailPlus className="text-[var(--color-text-light-3)]" size={44} />
      
      <div className="space-y-1">
        <h2 className="text-[20px] font-semibold text-[var(--color-text-light)]">Your outreach starts here</h2>
        <p className="text-[14px] text-[var(--color-text-light-2)]">
          Upload a CSV of contacts to begin.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-[12px] mt-6 w-full max-w-[532px]">
        <div className="flex-1 h-[150px] bg-[var(--color-surface-dark)] border-2 border-dashed border-[var(--color-border-dark)] rounded-[var(--radius-xl)] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[var(--color-brand-core)] hover:bg-[rgba(193,53,64,0.04)] hover:scale-[1.01] transition-all duration-200">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-light-3)]"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m16 16-4-4-4 4"></path></svg>
          <span className="text-[14px] font-medium text-[var(--color-text-light-2)]">Upload CSV</span>
        </div>

        <div className="flex-1 h-[150px] bg-[var(--color-surface-dark)] border-2 border-dashed border-[var(--color-border-dark)] rounded-[var(--radius-xl)] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[var(--color-brand-core)] hover:bg-[rgba(193,53,64,0.04)] hover:scale-[1.01] transition-all duration-200">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-light-3)]"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path></svg>
          <span className="text-[14px] font-medium text-[var(--color-text-light-2)]">Upload Resume</span>
        </div>
      </div>
    </div>
  );
}
