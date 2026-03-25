import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#1A1210] border-t border-[#2E2626]">
      <div className="max-w-[1280px] mx-auto w-full px-16 max-md:px-6 h-[160px] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#D94048" />
          </svg>
          <span className="text-[13px] text-[#6B5555]">© 2025 Coldstart</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] text-[#6B5555]">
          <Link href="#" className="hover:text-[#B09898] transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-[#B09898] transition-colors">Terms</Link>
          <Link href="#" className="hover:text-[#B09898] transition-colors">GitHub</Link>
        </div>
      </div>
    </footer>
  );
}
