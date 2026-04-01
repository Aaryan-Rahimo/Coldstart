'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'gmail' | 'github' | 'done'

type AuthMe = {
  user_id: string
  email: string | null
  has_github: boolean
  has_google: boolean
}

export function OnboardingBanner() {
  const [step, setStep] = useState<Step | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/backend/auth/me', { cache: 'no-store' })
        if (!res.ok) return

        const data = (await res.json()) as AuthMe

        if (!data.has_google) {
          setStep('gmail')
        } else if (!data.has_github) {
          setStep('github')
        } else {
          setStep('done')
        }
      } catch {
        // If the backend is unreachable, fall back to Supabase check
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const provider = user.app_metadata?.provider as string
        const identities = user.identities ?? []
        const hasGithub =
          provider === 'github' ||
          identities.some((i: { provider: string }) => i.provider === 'github')

        const { data: gmailData } = await supabase
          .from('gmail_connections')
          .select('id')
          .eq('user_id', user.id)
          .single()

        const hasGmail = !!gmailData

        if (!hasGmail) {
          setStep('gmail')
        } else if (!hasGithub) {
          setStep('github')
        } else {
          setStep('done')
        }
      }
    }
    check()
  }, [])

  const connectGmail = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/gmail.send',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  const connectGithub = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (step === null || step === 'done') return null

  return (
    <div className="w-full rounded-2xl border border-[#E9DDD5] bg-white p-6 shadow-[0_8px_24px_rgba(54,35,26,0.05)] flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-[#1E1310] font-semibold text-[16px]">
          {step === 'gmail'
            ? 'Connect Gmail to start sending emails'
            : 'Connect GitHub to personalize your emails'}
        </p>
        <p className="text-[#6F5A52] text-[13px]">
          {step === 'gmail'
            ? 'Coldstart sends emails directly from your Gmail account. Connect it to unlock sending.'
            : 'We use your GitHub profile to write more personalized cold emails referencing your real projects.'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {step === 'gmail' && (
          <button
            onClick={connectGmail}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#E53935] text-white font-semibold text-[13px] rounded-full px-5 py-2.5 hover:bg-[#C13540] transition-colors disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white"/>
            </svg>
            Connect Gmail
          </button>
        )}

        {step === 'github' && (
          <button
            onClick={connectGithub}
            disabled={isLoading}
            className="flex items-center gap-2 bg-[#1E1310] text-white font-semibold text-[13px] rounded-full px-5 py-2.5 hover:bg-[#2C1E1A] transition-colors disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Connect GitHub
          </button>
        )}

        <button
          onClick={() => setStep(step === 'gmail' ? 'github' : 'done')}
          className="text-[13px] text-[#8A7268] hover:text-[#6F5A52] transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
