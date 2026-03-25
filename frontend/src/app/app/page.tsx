"use client";

import { useEffect, useState } from "react";

import { DashboardEmails } from "@/components/emails/DashboardEmails";
import { createClient } from "@/lib/supabase";

export default function AppPage() {
  const supabase = createClient()

  // Check Gmail connection on mount
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function checkGmail() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      setReady(true)
    }
    checkGmail()
  }, [supabase])

  return (
    <div className="relative h-full w-full">
      {!ready && (
        <div className="text-[#B09898] text-sm">Checking Gmail connection...</div>
      )}

      {ready && (
        <DashboardEmails />
      )}
    </div>
  )
}
