import { NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const response = await fetch(`${getBackendBaseUrl()}/auth/google`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    redirect: "manual",
  });

  const redirectUrl = response.headers.get("location");
  if (!redirectUrl) {
    return NextResponse.json({ error: "Failed to start Google OAuth" }, { status: 502 });
  }

  return NextResponse.redirect(redirectUrl);
}
