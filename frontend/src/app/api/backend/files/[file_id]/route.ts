import { NextRequest, NextResponse } from 'next/server'
import { getBackendBaseUrl } from '@/lib/backend'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ file_id: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { file_id } = await params

  try {
    const response = await fetch(
      `${getBackendBaseUrl()}/files/${file_id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    )

    const text = await response.text()
    if (!text.trim()) {
      return NextResponse.json({ success: false, error: 'Backend returned empty response' }, { status: 500 })
    }

    try {
      const payload = JSON.parse(text)
      return NextResponse.json(payload, { status: response.status })
    } catch {
      return NextResponse.json({ success: false, error: text.slice(0, 200) }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to reach backend' },
      { status: 500 }
    )
  }
}
