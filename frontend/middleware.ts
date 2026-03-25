import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PATHS = ["/app"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((base) => path === base || path.startsWith(`${base}/`));

  if (!isProtected) {
    return response;
  }

  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (!hasSupabaseAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
