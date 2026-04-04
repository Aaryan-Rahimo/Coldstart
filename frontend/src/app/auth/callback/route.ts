import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// Encryption helpers
const ENCRYPTION_KEY = scryptSync(
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY!,
  'coldstart-salt',
  32
)

function encrypt(text: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()

  // SSR client for session exchange (uses anon key + cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Admin client for DB writes — bypasses RLS using service role key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE
  if (!serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment')
    return NextResponse.redirect(`${origin}/login?error=server_config`)
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('Session exchange error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const session = data.session
  const userId = session.user.id
  const provider = session.user.app_metadata?.provider as string | undefined
  const providerToken = session.provider_token
  const providerRefreshToken = session.provider_refresh_token
  const identities = session.user.identities ?? []

  console.log('=== AUTH CALLBACK DEBUG ===')
  console.log('provider (app_metadata):', provider)
  console.log('provider_token exists:', !!providerToken)
  console.log('provider_token first 20:', providerToken ? providerToken.slice(0, 20) + '...' : 'null')
  console.log('identities:', identities.map((i: { provider: string }) => i.provider))

  // ──────────────────────────────────────────────────────────────
  // Detect which provider THIS callback is actually for.
  //
  // KEY INSIGHT: When a user links a secondary provider (e.g. GitHub)
  // to an existing account (e.g. Google), `app_metadata.provider` 
  // stays as the PRIMARY provider ("google"). But `provider_token`
  // belongs to whichever provider triggered THIS callback.
  //
  // To detect the actual provider for this callback, we compare
  // identities before and after — or simply check if a new identity
  // was recently added.
  // ──────────────────────────────────────────────────────────────

  const hasGithubIdentity = identities.some(
    (i: { provider: string }) => i.provider === 'github'
  )
  const hasGoogleIdentity = identities.some(
    (i: { provider: string }) => i.provider === 'google'
  )

  // Determine the actual provider for this specific callback
  // If primary provider is google but github identity exists and we have a token,
  // this is likely a GitHub link callback
  let actualProvider = provider
  if (provider === 'google' && hasGithubIdentity && providerToken) {
    // Check if this token looks like a GitHub token (starts with 'ghu_' or 'gho_')
    // OR if the user just linked GitHub (we can't easily tell, so we test the token)
    // The safest approach: try the token against GitHub API to see if it works
    try {
      const testRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Accept': 'application/vnd.github+json',
        },
      })
      if (testRes.ok) {
        actualProvider = 'github'
        console.log('Token validated as GitHub token via API test')
      } else {
        console.log('Token is NOT a GitHub token (API returned', testRes.status, ')')
      }
    } catch (e) {
      console.log('GitHub token test failed:', e)
    }
  }

  console.log('actualProvider resolved to:', actualProvider)

  // Store Google tokens
  if (actualProvider === 'google' && providerToken) {
    try {
      const encryptedAccess = encrypt(providerToken)
      const encryptedRefresh = providerRefreshToken ? encrypt(providerRefreshToken) : null
      const expiryDate = new Date(Date.now() + 3600 * 1000).toISOString()

      const { error: gmailErr } = await adminSupabase.from('gmail_connections').upsert(
        {
          user_id: userId,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          expiry_date: expiryDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      if (gmailErr) console.error('gmail_connections error:', gmailErr)

      const { error: intErr } = await adminSupabase.from('user_integrations').upsert(
        {
          user_id: userId,
          provider: 'google',
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      )
      if (intErr) console.error('google integration error:', intErr)
      else console.log('Google tokens stored successfully')
    } catch (e) {
      console.error('Failed to store Google tokens:', e)
    }
  }

  // Store GitHub tokens — works for BOTH primary login and link flow
  if (actualProvider === 'github' && providerToken) {
    try {
      const { error: intErr } = await adminSupabase.from('user_integrations').upsert(
        {
          user_id: userId,
          provider: 'github',
          access_token: providerToken,
          refresh_token: providerRefreshToken ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      )
      if (intErr) console.error('github integration upsert error:', intErr)
      else console.log('GitHub token stored successfully:', providerToken.slice(0, 10) + '...')
    } catch (e) {
      console.error('Failed to store GitHub tokens:', e)
    }
  }

  // Fallback: GitHub identity exists but no token captured at all
  // (e.g. token was null in the callback — rare but possible)
  if (hasGithubIdentity && !providerToken && actualProvider !== 'github') {
    const { data: existingGithub } = await adminSupabase
      .from('user_integrations')
      .select('id, access_token')
      .eq('user_id', userId)
      .eq('provider', 'github')
      .single()

    // Only set placeholder if we don't already have a real token stored
    if (!existingGithub || existingGithub.access_token === 'linked_via_supabase') {
      await adminSupabase.from('user_integrations').upsert(
        {
          user_id: userId,
          provider: 'github',
          access_token: 'linked_via_supabase',
          refresh_token: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      )
      console.log('GitHub identity detected but no token — stored placeholder')
    }
  }

  console.log('=== AUTH CALLBACK COMPLETE ===')

  return NextResponse.redirect(`${origin}/app`)
}
