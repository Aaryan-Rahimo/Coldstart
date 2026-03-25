'use client';

import React from 'react';
import Link from 'next/link';

export function CtaBanner() {
  return (
    <section
      className="relative min-h-[80svh] flex flex-col items-center justify-center text-center overflow-hidden py-16 md:py-20"
      style={{ background: 'linear-gradient(145deg, #C13540 0%, #E05858 50%, #F2B8B0 100%)' }}
    >
      {/* Noise texture overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto w-full px-16 max-md:px-6 flex flex-col items-center">
        <div className="flex flex-col items-center w-full py-6 md:py-8">
          <h2 className="text-[54px] font-bold text-white leading-[1.1] tracking-[-1.5px] max-w-[540px]">
            Start your outreach today.
          </h2>
          <p className="text-[18px] text-white/70 mt-4 max-w-[400px]">
            Generate your first 100 emails free. No credit card required.
          </p>
        </div>
        <Link href="/signup">
          <button className="bg-white text-[#C13540] font-bold text-[17px] rounded-full px-10 py-4 mt-10 hover:scale-105 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-200">
            Get started free
          </button>
        </Link>
      </div>
    </section>
  );
}
