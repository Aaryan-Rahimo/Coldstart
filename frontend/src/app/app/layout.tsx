import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      userEmail={user.email ?? ""}
      userName={
        (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
        "Coldstart User"
      }
      avatarUrl={typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null}
    >
      {children}
    </AppShell>
  );
}
