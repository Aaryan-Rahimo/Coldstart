import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("gmail_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ connected: false, error: "DB_READ_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ connected: Boolean(data) });
}
