'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useEmailsStore } from '@/store/emails';
import { RefreshCw } from 'lucide-react';

export function EmailDrawer() {
  const { drawerOpen, closeDrawer, editingId, emails, updateEmail, regenerateEmail, sendEmail } = useEmailsStore();
  
  const email = emails.find(e => e.id === editingId);
  const [localBody, setLocalBody] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (email) setLocalBody(email.fullBody);
  }, [email, email?.fullBody]);

  if (!email) return null;

  const handleSave = () => { if (email) updateEmail(email.id, localBody); };
  const handleRegenerate = () => {
    if (email) {
      setIsRegenerating(true);
      regenerateEmail(email.id);
      setTimeout(() => setIsRegenerating(false), 1500);
    }
  };

  const DrawerFooter = (
    <div className="flex items-center justify-end gap-3 w-full font-body">
      <button 
        className="flex items-center gap-[6px] text-[13px] text-[var(--color-text-light-2)] hover:text-[var(--color-text-light)] disabled:opacity-50 transition-colors"
        onClick={handleRegenerate} 
        disabled={isRegenerating || email.status === 'sent'}
      >
        <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
        Regenerate
      </button>

      <button 
        className="text-[13px] text-[var(--color-text-light-2)] hover:text-[var(--color-text-light)] disabled:opacity-50 transition-colors ml-1"
        onClick={handleSave}
        disabled={email.status === 'sent'}
      >
        Save
      </button>

      <button 
        className="h-[36px] px-4 bg-[var(--color-brand-core)] hover:bg-[var(--color-brand-deep)] text-white text-[13px] font-semibold rounded-[var(--radius-md)] flex items-center gap-[6px] disabled:opacity-50 transition-colors ml-3 active:scale-95"
        onClick={() => sendEmail(email.id)}
        disabled={email.status === 'sent'}
      >
        Send now →
      </button>
    </div>
  );

  return (
    <Drawer 
      isOpen={drawerOpen} 
      onClose={closeDrawer}
      title={
        <div className="flex flex-col font-body">
          <span className="text-[15px] font-semibold text-[var(--color-text-light)]">{email.company}</span>
          <span className="text-[12px] text-[var(--color-text-light-3)] font-normal">{email.contactEmail}</span>
        </div>
      }
      footer={DrawerFooter}
    >
      <div className="h-full flex flex-col relative font-body">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-[1.5px] text-[var(--color-text-light-3)]">GENERATED EMAIL</span>
          {email.status === 'sent' && (
            <span className="text-[11px] text-[#4CAF7D] font-mono tracking-wider font-medium px-2 py-0.5 bg-[rgba(76,175,125,0.12)] rounded-full">
              SENT
            </span>
          )}
        </div>
        
        <div className="relative flex-1 rounded-[var(--radius-md)] overflow-hidden border focus-within:border-[var(--color-brand-core)] focus-within:ring-[3px] focus-within:ring-[rgba(193,53,64,0.15)] transition-all bg-[var(--color-bg-dark)] border-[var(--color-border-dark)]">
          <textarea
            value={localBody}
            onChange={(e) => setLocalBody(e.target.value)}
            disabled={email.status === 'sent' || isRegenerating}
            className="w-full h-full p-[14px] bg-transparent text-[var(--color-text-light)] text-[14px] font-mono leading-[1.7] resize-none outline-none disabled:opacity-50"
            spellCheck={false}
          />
          
          {isRegenerating && (
            <div className="absolute inset-0 bg-[var(--color-surface-dark)]/80 backdrop-blur-sm flex items-center justify-center flex-col animate-fade-in-up">
              <RefreshCw className="text-[var(--color-brand-core)] animate-spin mb-4" size={24} />
              <p className="text-[14px] text-[var(--color-text-light)] font-medium">Rewriting draft...</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
