import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv, scryptSync } from 'crypto'

const ENCRYPTION_KEY = scryptSync(
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY!,
  'coldstart-salt',
  32
)

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
} | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function POST(request: NextRequest) {
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

  // Verify session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { to, subject, body } = await request.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 })
  }

  // Fetch Gmail tokens
  const { data: connection, error: connError } = await supabase
    .from('gmail_connections')
    .select('access_token, refresh_token, expiry_date')
    .eq('user_id', session.user.id)
    .single()

  if (connError || !connection) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 403 })
  }

  let accessToken = decrypt(connection.access_token)
  const refreshToken = connection.refresh_token ? decrypt(connection.refresh_token) : null

  // Refresh if expired
  const isExpired = connection.expiry_date
    ? new Date(connection.expiry_date) <= new Date(Date.now() + 60 * 1000)
    : true

  if (isExpired && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken)
    if (!refreshed) {
      return NextResponse.json({ error: 'Failed to refresh Gmail token' }, { status: 401 })
    }
    accessToken = refreshed.access_token

    // Update stored token
    const { createCipheriv, randomBytes } = await import('crypto')
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
    const encrypted = Buffer.concat([cipher.update(accessToken, 'utf8'), cipher.final()])
    const newEncrypted = iv.toString('hex') + ':' + encrypted.toString('hex')
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

    await supabase
      .from('gmail_connections')
      .update({ access_token: newEncrypted, expiry_date: newExpiry, updated_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
  }

  // Build email
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ]
  const rawEmail = Buffer.from(emailLines.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // Send via Gmail API
  const gmailRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEmail }),
    }
  )

  if (!gmailRes.ok) {
    const gmailError = await gmailRes.json()
    console.error('Gmail send error:', gmailError)
    return NextResponse.json({ error: 'Failed to send email', details: gmailError }, { status: 500 })
  }

  const result = await gmailRes.json()
  return NextResponse.json({ success: true, messageId: result.id })
}
