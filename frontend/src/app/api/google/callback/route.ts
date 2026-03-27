import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const response = await fetch(`${getBackendBaseUrl()}/auth/callback?${query}`, {
    method: "GET",
    redirect: "manual",
  });

  const redirectUrl = response.headers.get("location");
  if (!redirectUrl) {
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  }

  return NextResponse.redirect(redirectUrl);
}
