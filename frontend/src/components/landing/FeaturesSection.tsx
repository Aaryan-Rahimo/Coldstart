'use client';

import React from 'react';
import { UploadCloud, Sparkles, Send } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const cards = [
  {
    icon: UploadCloud,
    title: 'Upload & Parse',
    desc: 'Drop in a CSV of contacts and your resume. Parsed instantly, no formatting required.',
  },
  {
    icon: Sparkles,
    title: 'AI Generation',
    desc: 'Personalized emails for every contact — referencing their company, your projects, and your background.',
  },
  {
    icon: Send,
    title: 'Review & Send',
    desc: 'Edit any draft inline, regenerate with one click, and send directly via Gmail.',
  },
];

export function FeaturesSection() {
  const headerRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="features"
      className="min-h-[100svh] flex flex-col items-center justify-center py-20 md:py-28 lg:py-32"
      style={{
        backgroundImage: 'radial-gradient(circle, #EBE0DC 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        backgroundColor: 'white',
      }}
    >
      <div className="max-w-[1280px] mx-auto w-full px-16 max-md:px-6 flex flex-col items-center">
        {/* Header */}
        <div
          ref={headerRef}
          data-reveal
          className="text-center mb-16 w-full flex flex-col items-center py-6 md:py-8"
        >
          <p className="text-[11px] font-mono uppercase tracking-[3px] text-[#D94048] mb-3">Features</p>
          <h2 className="text-[44px] font-bold text-[#1A1210] leading-[1.15] tracking-[-1px] max-w-[520px] mx-auto text-balance">
            Everything you need to land the interview.
          </h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14 w-full max-w-lg mx-auto md:max-w-none md:mx-0 justify-items-stretch">
          {cards.map((card, i) => {
            const cardRef = useScrollReveal<HTMLDivElement>();
            return (
              <div
                key={i}
                ref={cardRef}
                data-reveal
                style={{ transitionDelay: `${i * 100}ms` }}
                className="relative rounded-2xl border border-[#EBE0DC] bg-[#FDF8F6] p-8 hover:shadow-[0_8px_32px_rgba(193,53,64,0.12)] hover:-translate-y-1 hover:border-[#F2B8B0] transition-all duration-200 overflow-hidden"
              >
                {/* Gradient top line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#D94048] to-transparent" />
                {/* Icon box */}
                <div className="w-11 h-11 rounded-xl bg-[#F9EDE8] flex items-center justify-center mb-5">
                  <card.icon className="w-5 h-5 text-[#D94048]" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#1A1210] mb-2">{card.title}</h3>
                <p className="text-[14px] text-[#5C4A46] leading-[1.65]">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
