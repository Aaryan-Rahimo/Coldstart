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
      className={`sticky top-0 z-[999] h-16 flex items-center bg-[rgba(255,255,255,0.95)] backdrop-blur-[12px] transition-all duration-200 ease-in-out border-b border-[rgba(0,0,0,0.06)] ${
        scrolled ? 'shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : ''
      }`}
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
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
