import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100svh] flex overflow-hidden">
      {/* Left panel — 55% */}
      <div
        className="hidden lg:flex w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #F9EDE8 0%, #FDF8F6 100%)' }}
      >
        {/* Blurred brand orb */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(193,53,64,0.12), transparent)',
            bottom: -100,
            left: -100,
            filter: 'blur(100px)',
          }}
        />

        {/* Content — p-16 so nothing is flush to the edge */}
        <div className="h-full flex flex-col justify-between p-16 relative z-10">
          {/* Top: Logo */}
          <Link href="/" className="flex items-center gap-2 w-fit">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#D94048" />
            </svg>
            <span className="font-bold text-[17px] text-[#1A1210]">Coldstart</span>
          </Link>

          {/* Middle: headline */}
          <div className="py-6 md:py-8">
            <h1 className="text-[52px] font-bold text-[#1A1210] leading-[1.1] tracking-[-1.5px]">
              Land the role.
            </h1>
            <p className="text-[16px] text-[#5C4A46] mt-3 leading-[1.6] max-w-[340px]">
              AI-powered precision outreach to help you connect with the right people and accelerate your career.
            </p>
          </div>

          {/* Bottom: trust points */}
          <div className="flex flex-col gap-3">
            {[
              'Personalized for every contact',
              'Sends from your Gmail',
              'Free to start',
            ].map((point) => (
              <div key={point} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[rgba(193,53,64,0.10)] flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-[#D94048]" />
                </div>
                <span className="text-[14px] text-[#5C4A46] font-medium">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — 45% */}
      <div className="w-full lg:w-[45%] bg-white border-l border-[#EBE0DC] flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-[360px] px-2">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-10 justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#D94048" />
            </svg>
            <span className="font-bold text-[17px] text-[#1A1210]">Coldstart</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
