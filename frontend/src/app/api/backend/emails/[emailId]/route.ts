import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ emailId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { emailId } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const response = await fetch(`${getBackendBaseUrl()}/emails/${emailId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
