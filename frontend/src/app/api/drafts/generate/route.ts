import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";

interface GenerateRequestBody {
  companyName: string;
  contactEmail: string;
  resumeText: string;
  githubSummary?: string;
}

type BackendGenerateResponse = {
  emails?: Array<{
    subject?: string;
    generated_text?: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<GenerateRequestBody>;

    if (!payload.companyName || !payload.contactEmail || !payload.resumeText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const response = await fetch(`${getBackendBaseUrl()}/generate-emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companies: [
          {
            company_name: payload.companyName,
            contact_email: payload.contactEmail,
          },
        ],
        resume_summary: payload.resumeText,
        github_summary: payload.githubSummary ?? null,
      }),
    });

    const backendPayload = (await response.json().catch(() => ({}))) as BackendGenerateResponse;
    if (!response.ok) {
      return NextResponse.json(backendPayload, { status: response.status });
    }

    const first = backendPayload.emails?.[0];
    if (!first?.subject || !first.generated_text) {
      return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
    }

    return NextResponse.json({ subject: first.subject, body: first.generated_text });
  } catch {
    return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
  }
}
