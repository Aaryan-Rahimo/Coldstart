import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// -- Encryption helpers -------------------------------------------------
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

// -- Auth callback handler ---------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const cookieStore = await cookies()

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

  // Exchange code for session
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

  // Only store Gmail tokens if logged in with Google AND token was granted
  if (provider === 'google' && providerToken) {
    try {
      const encryptedAccess = encrypt(providerToken)
      const encryptedRefresh = providerRefreshToken ? encrypt(providerRefreshToken) : null

      // Calculate expiry (Google tokens last 1 hour)
      const expiryDate = new Date(Date.now() + 3600 * 1000).toISOString()

      // Upsert so re-logins update the tokens
      const { error: dbError } = await supabase
        .from('gmail_connections')
        .upsert(
          {
            user_id: userId,
            access_token: encryptedAccess,
            refresh_token: encryptedRefresh,
            expiry_date: expiryDate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (dbError) console.error('Failed to store Gmail tokens:', dbError)
    } catch (encryptError) {
      console.error('Encryption error:', encryptError)
    }
  }

  return NextResponse.redirect(`${origin}/app`)
}
