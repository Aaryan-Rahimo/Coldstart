import { NextResponse } from 'next/server'
import { getBackendBaseUrl } from '@/lib/backend'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await fetch(`${getBackendBaseUrl()}/files/list`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: 'no-store',
    })

    const text = await response.text()
    if (!text.trim()) {
      return NextResponse.json({ success: false, error: 'Backend returned empty response' }, { status: 500 })
    }

    try {
      const payload = JSON.parse(text)
      return NextResponse.json(payload, { status: response.status })
    } catch {
      return NextResponse.json({ success: false, error: `Invalid JSON: ${text.slice(0, 200)}` }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to reach backend' },
      { status: 500 }
    )
  }
}
