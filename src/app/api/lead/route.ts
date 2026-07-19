import { NextRequest, NextResponse } from "next/server";

import type { LeadCaptureRequest } from "@/lib/lead-capture";

const EXTERNAL_LEAD_ENDPOINT =
  "https://admin.betterranking.co.uk/sender/api/f/bs_yldwv8pqxdg3nx9kgc8iq3y0";

function normalizePayload(
  payload: Partial<LeadCaptureRequest>,
  request: NextRequest,
): LeadCaptureRequest {
  const referer = request.headers.get("referer") || undefined;
  const hostname =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || undefined;

  return {
    email: String(payload.email || "").trim(),
    form_name: "coming_soon_signup",
    landing_page: payload.landing_page || referer,
    referrer: payload.referrer || referer,
    hostname: payload.hostname || hostname,
    website: payload.website || "",
  };
}

async function forwardLead(payload: LeadCaptureRequest) {
  const response = await fetch(EXTERNAL_LEAD_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ ok: response.ok }));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || "Request failed");
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Partial<LeadCaptureRequest>;
      const payload = normalizePayload(body, request);

      await forwardLead(payload);
      return NextResponse.json({ ok: true });
    }

    const formData = await request.formData();
    const payload = normalizePayload(
      {
        email: String(formData.get("email") || ""),
        website: String(formData.get("website") || ""),
      },
      request,
    );

    await forwardLead(payload);

    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("status", "success");
    return NextResponse.redirect(redirectUrl, 303);
  } catch {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
    }

    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("status", "error");
    return NextResponse.redirect(redirectUrl, 303);
  }
}
