import { NextRequest, NextResponse } from 'next/server'
import { getBackendBaseUrl } from '@/lib/backend'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()

    const response = await fetch(`${getBackendBaseUrl()}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    const text = await response.text()
    console.log(`[upload proxy] status=${response.status} body=${text.slice(0, 300)}`)

    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Backend returned empty response. Check backend logs.' },
        { status: 500 }
      )
    }

    try {
      const payload = JSON.parse(text)
      return NextResponse.json(payload, { status: response.status })
    } catch {
      return NextResponse.json(
        { success: false, error: `Backend returned invalid JSON: ${text.slice(0, 200)}` },
        { status: 500 }
      )
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[upload proxy] error:', message)
    return NextResponse.json(
      { success: false, error: `Failed to reach backend: ${message}` },
      { status: 500 }
    )
  }
}
