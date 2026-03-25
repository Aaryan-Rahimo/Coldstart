'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100svh] flex overflow-hidden font-body">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-[220px] bg-[var(--color-bg-dark)] h-full">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-[56px] scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
