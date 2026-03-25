'use client';

import React from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const steps = [
  { title: 'Upload your CSV', desc: 'Company names, contact emails, and any notes.' },
  { title: 'Add your resume', desc: 'PDF upload. We extract skills, projects, and experience.' },
  { title: 'Generate emails', desc: 'One click. AI writes a unique email per contact.' },
  { title: 'Review & send', desc: 'Edit any draft and send directly from your Gmail.' },
];

export function HowItWorksSection() {
  const headerRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="how-it-works"
      className="min-h-[100svh] flex flex-col items-center justify-center py-20 md:py-28 lg:py-32 bg-[#F9EDE8]"
    >
      <div className="max-w-[1280px] mx-auto w-full px-16 max-md:px-6 flex flex-col items-center">
        {/* Header */}
        <div
          ref={headerRef}
          data-reveal
          className="text-center mb-20 w-full flex flex-col items-center py-6 md:py-8"
        >
          <p className="text-[11px] font-mono uppercase tracking-[3px] text-[#D94048] mb-3">How it works</p>
          <h2 className="text-[44px] font-bold text-[#1A1210] leading-[1.15] tracking-[-1px] max-w-[720px] mx-auto text-balance">
            From CSV to sent in minutes.
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start relative w-full">
          {/* Connector line */}
          <div className="hidden md:block absolute top-5 left-[12.5%] right-[12.5%] h-px bg-[#EBE0DC] z-0" />

          {steps.map((step, i) => {
            const stepRef = useScrollReveal<HTMLDivElement>();
            return (
              <div
                key={i}
                ref={stepRef}
                data-reveal
                style={{ transitionDelay: `${i * 80}ms` }}
                className="relative z-10 flex flex-col items-center text-center gap-3"
              >
                <div className="w-10 h-10 rounded-full border-2 border-[#EBE0DC] bg-[#F9EDE8] flex items-center justify-center">
                  <span className="text-[12px] font-mono font-medium text-[#D94048]">0{i + 1}</span>
                </div>
                <h4 className="text-[15px] font-semibold text-[#1A1210]">{step.title}</h4>
                <p className="text-[13px] text-[#5C4A46] leading-[1.6] max-w-[200px]">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
