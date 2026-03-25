'use client';

import React from 'react';
import Link from 'next/link';
import Grainient from '@/components/Grainient';

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[100svh] flex flex-col justify-center pt-[64px] overflow-hidden">
      {/* Grainient background */}
      <div className="absolute inset-0 w-full h-full -z-10 pointer-events-none">
        <Grainient
          color1="#ffffff"
          color2="#f5babe"
          color3="#fddede"
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.07}
          grainScale={2}
          grainAnimated={false}
          contrast={1.65}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>

      {/* Inner grid */}
      <div className="w-full max-w-[1200px] mx-auto px-16 max-md:px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10 py-16">

        {/* ── Left column ───────────────────────────────────── */}
        <div className="flex flex-col items-start gap-6">

          {/* Announcement badge */}
          <div className="animate-fade-in-up flex items-center gap-2 border border-[#EBE0DC] bg-white rounded-full px-4 py-2 shadow-sm" style={{ animationDelay: '0ms' }}>
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D94048] opacity-50" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-[#D94048]" />
            </span>
            <span className="text-[13px] font-medium text-[#5C4A46]">Now in beta — 100 emails free</span>
            <Link href="/signup" className="text-[13px] font-semibold text-[#D94048] hover:underline">Try it →</Link>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up text-[64px] font-bold leading-[1.08] text-[#1A1210] tracking-[-1.5px]"
            style={{ animationDelay: '80ms' }}
          >
            Cold emails that actually get replies.
          </h1>

          {/* Subtext */}
          <p
            className="animate-fade-in-up text-[17px] text-[#5C4A46] leading-[1.65] max-w-[460px]"
            style={{ animationDelay: '160ms' }}
          >
            Upload your contacts and resume. Coldstart uses AI to write a personalized email for every single contact — in seconds.
          </p>

          {/* CTA row */}
          <div className="animate-fade-in-up flex items-center gap-4" style={{ animationDelay: '240ms' }}>
            <Link href="/signup">
              <button className="bg-[#D94048] text-white font-semibold text-[15px] rounded-full px-7 py-3.5 hover:bg-[#C13540] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(193,53,64,0.4)]">
                Start for free
              </button>
            </Link>
            <Link href="#how-it-works">
              <button className="text-[15px] text-[#5C4A46] hover:text-[#1A1210] hover:underline underline-offset-2 transition-colors">
                See how it works
              </button>
            </Link>
          </div>

          {/* Trust line */}
          <p
            className="animate-fade-in-up text-[11px] font-mono text-[#A08880] flex gap-4"
            style={{ animationDelay: '320ms' }}
          >
            <span>✓ No credit card</span>
            <span>✓ 100 emails free</span>
            <span>✓ 2 minute setup</span>
          </p>
        </div>

        {/* ── Right column — Mac window mockup ──────────────── */}
        <div className="mockup-float w-full animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.18)] border border-[#E5E5E5] bg-white">
            {/* Browser chrome bar */}
            <div className="h-10 bg-[#F5F5F5] border-b border-[#E5E5E5] flex items-center px-4 gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-[#E8E8E8] rounded-md px-4 py-1 text-[11px] font-mono text-[#888] w-48 text-center">
                  coldstart.app
                </div>
              </div>
            </div>
            {/* Dark table interior */}
            <div className="bg-[#100D0D]">
              <div className="grid grid-cols-[1fr_1fr_2fr_80px] border-b border-[#2E2626] px-5 py-2.5">
                {['COMPANY', 'CONTACT EMAIL', 'EMAIL PREVIEW', 'STATUS'].map(h => (
                  <span key={h} className="text-[10px] font-mono uppercase tracking-widest text-[#6B5555]">{h}</span>
                ))}
              </div>
              {[
                { company: 'Stripe', email: 'recruiting@stripe.com', preview: "Hi team, I noticed you're revamping...", status: 'sent' },
                { company: 'Vercel', email: 'lee@vercel.com', preview: 'Lee, loved the Next.js 15 conf talk!...', status: 'sent' },
                { company: 'Linear', email: 'hello@linear.app', preview: "Hello, Linear's keyboard-first desi...", status: 'draft' },
                { company: 'OpenAI', email: 'sam@openai.com', preview: 'Sam, the new model inference sp...', status: 'draft' },
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_2fr_80px] border-b border-[#1E1919] px-5 py-3.5 items-center hover:bg-[#1C1717] transition-colors"
                >
                  <span className="text-[13px] font-semibold text-[#F5EFEF]">{row.company}</span>
                  <span className="text-[12px] text-[#6B5555]">{row.email}</span>
                  <span className="text-[12px] text-[#B09898] truncate pr-4">{row.preview}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full w-fit ${
                    row.status === 'sent'
                      ? 'bg-[rgba(76,175,125,0.15)] text-[#4CAF7D]'
                      : 'bg-[rgba(242,184,176,0.12)] text-[#F2B8B0]'
                  }`}>
                    {row.status.toUpperCase()}
                  </span>
                </div>
              ))}
              <div className="h-8" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}