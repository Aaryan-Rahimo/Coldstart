import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: gmailConnection } = await supabase
    .from("gmail_connections")
    .select("id, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="w-full h-full flex items-center justify-center px-6">
      <div className="w-full max-w-[620px] rounded-2xl border border-[var(--color-border-dark)] bg-[var(--color-surface-dark)] p-7">
        <h1 className="text-[22px] font-semibold text-[var(--color-text-light)]">Account Settings</h1>
        <p className="mt-2 text-[14px] text-[var(--color-text-light-2)]">Manage your Gmail connection for sending cold emails.</p>

        <div className="mt-6 rounded-xl border border-[var(--color-border-dark)] bg-[var(--color-bg-dark)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--color-text-light)]">Gmail Connection</h2>
              <p className="mt-1 text-[13px] text-[var(--color-text-light-2)]">
                {gmailConnection
                  ? "Connected. You can now send emails from Coldstart."
                  : "Not connected. Connect Gmail to enable sending."}
              </p>
            </div>
            <Link
              href="/api/google/auth"
              className="inline-flex h-[36px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-core)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--color-brand-deep)]"
            >
              {gmailConnection ? "Reconnect" : "Connect Gmail"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
