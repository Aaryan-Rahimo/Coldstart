'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function AuthCard({ mode, configError }: { mode: 'login' | 'signup'; configError?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('Email/password auth is disabled. Please continue with Google.');
  };

  const handleOAuth = async () => {
    if (configError) {
      setError(configError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/gmail.send',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Auth error:', error);
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Supabase client');
      setIsLoading(false);
    }
  };

  const labelClass = 'text-[12px] font-semibold text-[#1A1210] mb-1.5 block';
  const inputClass = 'w-full h-11 bg-[#FDF8F6] border border-[#EBE0DC] rounded-lg px-3 text-[14px] text-[#1A1210] outline-none transition-all focus:border-[#D94048] focus:ring-2 focus:ring-[rgba(193,53,64,0.14)]';

  return (
    <div className="w-full">
      <div className="py-4 md:py-6">
        <h2 className="text-[24px] font-bold text-[#1A1210] leading-[1.2]">
          {isLogin ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-[14px] text-[#5C4A46] mt-1 mb-6">
          {isLogin ? 'Sign in to access your dashboard' : 'Start your free trial today'}
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleOAuth}
        disabled={isLoading || Boolean(configError)}
        className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-[#EBE0DC] rounded-lg text-[14px] font-medium text-[#1A1210] hover:bg-[#FDF8F6] hover:border-[#D94048] transition-all disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center my-5">
        <div className="flex-1 border-t border-[#EBE0DC]" />
        <span className="px-3 text-[11px] text-[#A08880] uppercase tracking-wider font-mono">or</span>
        <div className="flex-1 border-t border-[#EBE0DC]" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Email address</label>
          <input
            type="email"
            placeholder="you@company.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass} style={{ marginBottom: 0 }}>Password</label>
            {isLogin && (
              <Link href="#" className="text-[11px] text-[#D94048] font-medium hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <input
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#D94048] text-white font-semibold text-[15px] rounded-lg hover:bg-[#C13540] transition-colors disabled:opacity-60 mt-1"
        >
          {isLogin ? 'Sign in with email (disabled)' : 'Create account with email (disabled)'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-[12px] text-[#D94048]">{error}</p>
      )}

      {configError && !error && (
        <p className="mt-3 text-[12px] text-[#D94048]">{configError}</p>
      )}

      {/* Toggle link */}
      <p className="text-center mt-5 text-[13px] text-[#5C4A46]">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <Link
          href={isLogin ? '/signup' : '/login'}
          className="text-[#D94048] font-semibold hover:underline underline-offset-2"
        >
          {isLogin ? 'Sign up' : 'Log in'}
        </Link>
      </p>
    </div>
  );
}
