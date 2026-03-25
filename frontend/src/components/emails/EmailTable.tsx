'use client';

import React from 'react';
import { useEmailsStore } from '@/store/emails';
import { Badge } from '@/components/ui/Badge';
import { Edit2, RefreshCw, SendHorizontal } from 'lucide-react';

export function EmailTable() {
  const { emails, selectedIds, toggleSelection, selectAll, openDrawer, regenerateEmail, sendEmail, isGenerating } = useEmailsStore();

  const allSelected = emails.length > 0 && selectedIds.length === emails.length;
  const indeterminate = selectedIds.length > 0 && selectedIds.length < emails.length;

  const handleSelectAll = () => {
    if (allSelected) {
      selectAll([]);
    } else {
      selectAll(emails.map(e => e.id));
    }
  };

  return (
    <div className="w-full overflow-x-auto min-h-0 flex-1 flex flex-col animate-fade-in-up transition-opacity duration-300">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-[var(--color-surface-dark)] z-10">
          <tr>
            <th className="w-12 px-4 py-3 border-b border-[var(--color-border-dark)]">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] text-[var(--color-brand-core)] focus:ring-[var(--color-brand-core)] focus:ring-opacity-20 cursor-pointer accent-[var(--color-brand-core)]"
                checked={allSelected}
                ref={input => {
                  if (input) input.indeterminate = indeterminate;
                }}
                onChange={handleSelectAll}
              />
            </th>
            <th className="w-[180px] h-[44px] px-4 py-3 text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--color-text-light-3)] border-b border-[var(--color-border-dark)] font-normal">Company</th>
            <th className="w-[200px] h-[44px] px-4 py-3 text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--color-text-light-3)] border-b border-[var(--color-border-dark)] font-normal">Contact</th>
            <th className="px-4 py-3 h-[44px] text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--color-text-light-3)] border-b border-[var(--color-border-dark)] font-normal">Preview</th>
            <th className="w-[100px] h-[44px] px-4 py-3 text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--color-text-light-3)] border-b border-[var(--color-border-dark)] font-normal">Status</th>
            <th className="w-[112px] h-[44px] px-4 py-3 text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--color-text-light-3)] border-b border-[var(--color-border-dark)] font-normal text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-[var(--color-bg-dark)]">
          {emails.map((email, index) => {
            const isSelected = selectedIds.includes(email.id);
            
            return (
              <tr 
                key={email.id} 
                className={`
                  group border-b border-[var(--color-border-dark)] transition-colors h-[52px]
                  ${isSelected ? 'bg-[rgba(193,53,64,0.07)]' : 'hover:bg-[var(--color-surface-dark)]'}
                  animate-fade-in-up
                `}
                style={{ animationDelay: `${index * 25}ms`, animationFillMode: 'both' }}
                onClick={() => toggleSelection(email.id)}
              >
                <td className="w-12 px-4 py-2 border-l-2" style={{ borderLeftColor: isSelected ? 'var(--color-brand-core)' : 'transparent' }}>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-[var(--color-border-dark)] bg-transparent text-[var(--color-brand-core)] focus:ring-[var(--color-brand-core)] focus:ring-opacity-20 cursor-pointer accent-[var(--color-brand-core)]"
                    checked={isSelected}
                    onChange={() => toggleSelection(email.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-2 text-[14px] font-body font-medium text-[var(--color-text-light)] truncate max-w-[180px]">
                  {email.company}
                </td>
                <td className="px-4 py-2 text-[13px] font-body text-[var(--color-text-light-2)] truncate max-w-[200px]">
                  {email.contactEmail}
                  {email.role && <span className="text-[13px] ml-2 italic text-[var(--color-text-light-3)]">({email.role})</span>}
                </td>
                <td className="px-4 py-2 text-[13px] font-body text-[var(--color-text-light-2)] truncate max-w-[300px] lg:max-w-[400px]">
                  {email.preview}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={email.status as 'draft'|'sent'|'failed'|'neutral'}>{email.status}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button 
                      className="w-[28px] h-[28px] flex items-center justify-center text-[var(--color-text-light-3)] hover:text-[var(--color-text-light)] hover:bg-[var(--color-surface-dark-2)] rounded-[var(--radius-sm)] transition-colors"
                      onClick={(e) => { e.stopPropagation(); openDrawer(email.id); }}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    {email.status !== 'sent' && (
                      <>
                        <button 
                          className="w-[28px] h-[28px] flex items-center justify-center text-[var(--color-text-light-3)] hover:text-[var(--color-text-light)] hover:bg-[var(--color-surface-dark-2)] rounded-[var(--radius-sm)] transition-colors"
                          onClick={(e) => { e.stopPropagation(); regenerateEmail(email.id); }}
                          title="Regenerate"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button 
                          className="w-[28px] h-[28px] flex items-center justify-center text-[var(--color-text-light-3)] hover:text-[var(--color-text-light)] hover:bg-[var(--color-surface-dark-2)] rounded-[var(--radius-sm)] transition-colors"
                          onClick={(e) => { e.stopPropagation(); sendEmail(email.id); }}
                          title="Send"
                        >
                          <SendHorizontal size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          
          {isGenerating && (
            <tr className="border-b border-[var(--color-border-dark)] h-[52px]">
              <td colSpan={6} className="px-4 py-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-surface-dark)] via-[var(--color-surface-dark-2)] to-[var(--color-surface-dark)] animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
                <div className="flex items-center gap-3 relative z-10">
                  <span className="w-4 h-4 rounded bg-[var(--color-surface-dark-2)]" />
                  <div className="h-4 w-24 bg-[var(--color-surface-dark-2)] rounded" />
                  <div className="h-4 w-32 bg-[var(--color-surface-dark-2)] rounded ml-auto" />
                  <div className="h-4 w-64 bg-[var(--color-surface-dark-2)] rounded mr-auto" />
                  <div className="h-4 w-16 bg-[var(--color-surface-dark-2)] rounded-full" />
                  <div className="h-6 w-20 bg-[var(--color-surface-dark-2)] rounded ml-auto" />
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
