import { createClient } from '@/lib/supabase'

export async function getGmailConnectionStatus(userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('gmail_connections')
    .select('id')
    .eq('user_id', userId)
    .single()
  return !error && !!data
}
