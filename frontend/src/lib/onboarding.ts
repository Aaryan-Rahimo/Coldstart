import { SupabaseClient } from '@supabase/supabase-js'

export type OnboardingState = {
  hasGmail: boolean
  hasGithub: boolean
  provider: string | null
}

export async function getOnboardingState(
  supabase: SupabaseClient
): Promise<OnboardingState> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { hasGmail: false, hasGithub: false, provider: null }

  const provider = user.app_metadata?.provider as string | null

  // Check Gmail connection in database
  const { data: gmailData } = await supabase
    .from('gmail_connections')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const hasGmail = !!gmailData

  // Check if user has connected GitHub
  // GitHub users have provider === 'github'
  // Google users who have also linked GitHub will have it in identities
  const identities = user.identities ?? []
  const hasGithub =
    provider === 'github' ||
    identities.some((i: { provider: string }) => i.provider === 'github')

  return { hasGmail, hasGithub, provider }
}
