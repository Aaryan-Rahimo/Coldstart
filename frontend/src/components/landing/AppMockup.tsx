'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

export function AppMockup() {
  return (
    <div 
      className="mt-16 max-w-5xl mx-auto w-full bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] border border-[var(--color-border-light)] overflow-hidden animate-fade-in-up" 
      style={{ animationDelay: '500ms', animationDuration: '700ms', animationFillMode: 'both' }}
    >
      {/* Browser Chrome */}
      <div className="h-10 bg-[#F5F5F5] border-b border-[var(--color-border-light)] flex items-center px-3.5 gap-2 relative">
        <div className="flex gap-1.5 absolute left-3.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/20" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/20" />
        </div>
        <div className="mx-auto bg-white border border-[var(--color-border-light)] text-[11px] text-[var(--color-text-muted-light)] font-mono px-3 py-1 rounded-md hidden sm:block">
          coldstart.app
        </div>
      </div>

      {/* Mockup Interior - Dark Theme */}
      <div className="bg-[var(--color-bg-dark)] h-[320px] flex flex-col">
        {/* Table Header */}
        <div className="flex items-center px-4 h-11 border-b border-[var(--color-border-dark)] bg-[var(--color-surface-dark)] text-[10px] uppercase font-mono tracking-[1.5px] text-[var(--color-text-light-3)]">
          <div className="w-10"></div>
          <div className="flex-1 max-w-[180px]">Company</div>
          <div className="flex-1 max-w-[200px] hidden sm:block">Contact Email</div>
          <div className="flex-1 hidden md:block">Email Preview</div>
          <div className="w-24">Status</div>
        </div>

        {/* Rows */}
        {[
          { company: 'Stripe', contact: 'recruiting@stripe.com', preview: "Hi team, I noticed you're revamping the billing...", status: 'Sent', type: 'sent' },
          { company: 'Vercel', contact: 'lee@vercel.com', preview: "Lee, loved the Next.js 15 conf talk! I built a...", status: 'Sent', type: 'sent' },
          { company: 'Linear', contact: 'hello@linear.app', preview: "Hello, Linear's keyboard-first design heavily...", status: 'Draft', type: 'draft' },
          { company: 'OpenAI', contact: 'sam@openai.com', preview: "Sam, the new model inference speed is incredible...", status: 'Draft', type: 'draft' },
        ].map((row, i) => (
          <div key={i} className="flex items-center px-4 h-10 border-b border-[var(--color-border-dark)] hover:bg-[var(--color-surface-dark-2)]/50 transition-colors cursor-default">
            <div className="w-10 flex items-center mt-0.5">
              <div className="w-3.5 h-3.5 rounded-[3px] border border-[var(--color-border-dark)] bg-[var(--color-surface-dark)]" />
            </div>
            <div className="flex-1 max-w-[180px] text-[14px] font-medium text-[var(--color-text-light)] truncate pr-4">
              {row.company}
            </div>
            <div className="flex-1 max-w-[200px] hidden sm:block text-[12px] text-[var(--color-text-light-3)] truncate pr-4">
              {row.contact}
            </div>
            <div className="flex-1 hidden md:block text-[12px] text-[var(--color-text-light-2)] truncate pr-4">
              {row.preview}
            </div>
            <div className="w-24">
              <Badge variant={row.type as any}>{row.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
