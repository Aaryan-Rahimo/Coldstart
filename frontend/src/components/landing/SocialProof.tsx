'use client';

import React from 'react';

export function SocialProof() {
  return (
    <section className="w-full bg-[#F9EDE8] border-y border-[#EBE0DC] py-8 md:py-10 flex items-center justify-center">
      <div className="max-w-[1280px] mx-auto w-full px-16 max-md:px-6 flex flex-col md:flex-row flex-wrap items-center justify-center gap-y-4 gap-x-6 md:gap-x-12 text-center">
        <span className="text-[12px] font-mono uppercase tracking-widest text-[#A08880] shrink-0">
          Used by students at
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8 md:gap-x-10">
          {['McMaster', 'Waterloo', 'UofT', 'Western', "Queen's"].map((name) => (
            <span
              key={name}
              className="text-[14px] font-bold text-[#5C4A46] opacity-50 hover:opacity-80 transition-opacity cursor-default"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
