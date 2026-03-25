'use client';

import React from 'react';
import { UploadCloud, FileText, Sparkles, Send } from 'lucide-react';
import { useEmailsStore } from '@/store/emails';

export function TopBar() {
  const { emails, selectedIds, isGenerating, mockGenerate } = useEmailsStore();
  const hasSelection = selectedIds.length > 0;

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[220px] h-[56px] min-h-[56px] bg-[var(--color-surface-dark)] border-b border-[var(--color-border-dark)] z-20 px-5 flex items-center gap-2 transition-all font-body">
      <div className="flex-1 flex items-center">
        <h1 className="font-semibold text-[16px] text-[var(--color-text-light)] hidden sm:block">Emails</h1>
      </div>
      
      <div className="flex items-center gap-[6px]">
        <button className="h-[32px] px-3 flex items-center gap-2 text-[12px] text-[var(--color-text-light-2)] border border-[var(--color-border-dark)] rounded-[var(--radius-md)] hover:bg-[var(--color-surface-dark-2)] hover:text-[var(--color-text-light)] transition-colors">
          <UploadCloud size={14} />
          <span className="hidden sm:inline">Upload CSV</span>
        </button>
        
        <button className="h-[32px] px-3 flex items-center gap-2 text-[12px] text-[var(--color-text-light-2)] border border-[var(--color-border-dark)] rounded-[var(--radius-md)] hover:bg-[var(--color-surface-dark-2)] hover:text-[var(--color-text-light)] transition-colors">
          <FileText size={14} />
          <span className="hidden sm:inline">Upload Resume</span>
        </button>
        
        <button 
          onClick={mockGenerate}
          disabled={isGenerating}
          className="h-[32px] px-3 flex items-center gap-2 text-[13px] font-semibold text-white bg-[var(--color-brand-core)] rounded-[var(--radius-md)] hover:bg-[var(--color-brand-deep)] transition-colors disabled:opacity-65 disabled:pointer-events-none"
        >
          {isGenerating ? (
            <Sparkles size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Generate Emails'}</span>
          <span className="sm:hidden">Generate</span>
        </button>
        
        <button 
          disabled={!hasSelection}
          className={`h-[32px] px-3 flex items-center gap-2 text-[12px] font-medium border border-[var(--color-border-dark)] rounded-[var(--radius-md)] transition-colors ${hasSelection ? 'text-[var(--color-text-light-2)] hover:bg-[var(--color-surface-dark-2)] hover:text-[var(--color-text-light)]' : 'text-[var(--color-text-light-3)] opacity-40 pointer-events-none'}`}
        >
          <Send size={14} />
          <span className="hidden lg:inline">Send Selected</span>
        </button>
      </div>
    </header>
  );
}
