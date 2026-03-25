'use client';

import React, { useMemo, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const themeVars = useMemo(
    () =>
      (isDarkMode
        ? {
            "--color-bg-dark": "#171312",
            "--color-bg": "#171312",
            "--color-surface-dark": "#1D1716",
            "--color-surface-dark-2": "#2B2321",
            "--color-border-dark": "#3A2E2A",
            "--color-text-light": "#F5EFEF",
            "--color-text-light-2": "#C7B4AE",
            "--color-text-light-3": "#9D857E",
            "--color-brand-core": "#D94048",
            "--color-brand-deep": "#C13540",
            "--color-brand-soft": "#E96B72",
          }
        : {
            "--color-bg-dark": "#F7F3F1",
            "--color-bg": "#F7F3F1",
            "--color-surface-dark": "#FFFFFF",
            "--color-surface-dark-2": "#F3ECE9",
            "--color-border-dark": "#E7DDD8",
            "--color-text-light": "#1A1210",
            "--color-text-light-2": "#5E4D48",
            "--color-text-light-3": "#8F7C76",
            "--color-brand-core": "#D94048",
            "--color-brand-deep": "#C13540",
            "--color-brand-soft": "#D94048",
          }) as React.CSSProperties,
    [isDarkMode]
  );

  return (
    <div className="h-[100svh] flex overflow-hidden font-body" style={themeVars}>
      <Sidebar userEmail={userEmail} />
      <div className="flex-1 flex flex-col md:pl-[220px] bg-[var(--color-bg-dark)] h-full">
        <TopBar
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-[56px] scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
