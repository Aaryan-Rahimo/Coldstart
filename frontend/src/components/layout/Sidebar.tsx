'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Users, Settings, LogOut } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Emails', icon: Mail, href: '/app' },
    { name: 'Contacts', icon: Users, href: '/app/contacts' },
    { name: 'Settings', icon: Settings, href: '/app/settings' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-[220px] bg-[var(--color-surface-dark)] border-r border-[var(--color-border-dark)] flex flex-col z-30 transition-transform md:translate-x-0 -translate-x-full font-body">
      {/* Header */}
      <div className="h-[56px] flex items-center px-4">
        <Link href="/app" className="flex items-center space-x-2 text-[var(--color-text-light)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="var(--color-brand-core)" />
          </svg>
          <span className="font-semibold text-[15px]">Coldstart</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 px-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 h-9 px-3 rounded-[var(--radius-md)] text-[14px] font-medium transition-colors cursor-pointer select-none
                ${isActive 
                  ? 'bg-[rgba(193,53,64,0.10)] text-[var(--color-brand-soft)] relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--color-brand-core)] before:rounded-r-full' 
                  : 'text-[var(--color-text-light-2)] hover:text-[var(--color-text-light)] hover:bg-[var(--color-surface-dark-2)]'}
              `}
            >
              <item.icon size={16} className={`${isActive ? 'text-[var(--color-brand-soft)]' : 'text-[var(--color-text-light-3)]'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border-dark)] flex items-center mt-auto">
        <div className="w-[28px] h-[28px] rounded-full bg-[var(--color-brand-core)] flex items-center justify-center text-white font-semibold text-[13px]">
          U
        </div>
        <div className="ml-2 flex-1 min-w-0">
          <p className="text-[12px] text-[var(--color-text-light-3)] truncate">user@example.com</p>
        </div>
        <button 
          onClick={() => { window.location.href = '/login'; }}
          className="text-[var(--color-text-light-3)] hover:text-[var(--color-brand-soft)] transition-colors ml-auto"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
