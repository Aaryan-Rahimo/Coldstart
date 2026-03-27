'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

export function AppShell({
  children,
  userEmail,
  userName,
  avatarUrl,
}: {
  children: React.ReactNode;
  userEmail: string;
  userName: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const navItems = [
    { name: 'Dashboard', href: '/app' },
    { name: 'My Documents', href: '/app/documents' },
    { name: 'Drafts', href: '/app/drafts' },
    { name: 'Settings', href: '/app/settings' },
  ];

  return (
    <div
      className="h-[100svh] flex overflow-hidden font-body"
      style={{
        backgroundColor: '#F5F3F0',
      }}
    >
      <Sidebar userEmail={userEmail} userName={userName} avatarUrl={avatarUrl} />
      <div className="flex-1 flex flex-col md:pl-[220px] h-full">
        <div className="md:hidden sticky top-0 z-20 border-b border-[#E8DFD8] bg-white px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            {navItems.map((item) => {
              const active = item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-[12px] ${active ? 'bg-[#FDECEC] text-[#E53935]' : 'bg-[#F6F1ED] text-[#725F57]'}`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">{children}</main>
      </div>
    </div>
  );
}
