'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children, footer }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-200
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-[var(--color-surface-dark)]
          border-l border-[var(--color-border-dark)] shadow-2xl
          flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-[56px] px-5 border-b border-[var(--color-border-dark)]">
          <div className="font-display flex flex-col">{title}</div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-light-3)] hover:text-[var(--color-text-light)] w-8 h-8 flex items-center justify-center transition-colors rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-dark-2)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 h-[60px] flex items-center border-t border-[var(--color-border-dark)] bg-[var(--color-surface-dark)]">
            {footer}
          </div>
        )}
      </div>
    </>
  );
};
