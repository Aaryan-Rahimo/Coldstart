'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out h-16 ${
        scrolled
          ? 'bg-[rgba(253,248,246,0.90)] backdrop-blur-[16px] border-b border-[#EBE0DC]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto w-full px-16 max-md:px-6 h-full flex items-center justify-between">
        {/* Logo + nav links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#D94048" />
            </svg>
            <span className="font-bold text-[17px] text-[#1A1210]">Coldstart</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {['#features', '#how-it-works', '#pricing'].map((href, i) => (
              <Link
                key={href}
                href={href}
                className="text-[14px] font-medium text-[#5C4A46] hover:text-[#1A1210] transition-colors duration-150"
              >
                {['Features', 'How it works', 'Pricing'][i]}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden sm:block text-[14px] font-medium text-[#5C4A46] hover:text-[#1A1210] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1 bg-[#D94048] text-white text-[14px] font-semibold rounded-full px-5 py-2 hover:bg-[#C13540] transition-colors"
          >
            Get started free <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
