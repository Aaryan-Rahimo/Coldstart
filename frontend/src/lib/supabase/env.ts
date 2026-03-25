function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = readSupabaseEnv();
  return Boolean(url && anonKey);
}

export function getSupabaseEnv() {
  const { url, anonKey } = readSupabaseEnv();

  if (!url) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { supabaseUrl: url, supabaseAnonKey: anonKey };
}
