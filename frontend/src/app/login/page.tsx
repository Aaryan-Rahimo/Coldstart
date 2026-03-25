import { redirect } from "next/navigation";

import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AuthLayout>
        <AuthCard mode="login" configError="Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local and restart Next.js." />
      </AuthLayout>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/app');
  }

  return (
    <AuthLayout>
      <AuthCard mode="login" />
    </AuthLayout>
  );
}
