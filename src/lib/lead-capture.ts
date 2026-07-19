export const LEAD_API_ROUTE = "/api/lead";

export type LeadCaptureRequest = {
  email: string;
  form_name: "coming_soon_signup";
  landing_page?: string;
  referrer?: string;
  hostname?: string;
  website?: string;
};

export type LeadCaptureContext = {
  href?: string;
  referrer?: string;
  hostname?: string;
};

export function buildLeadCapturePayload(
  email: string,
  website: string,
  context: LeadCaptureContext = {},
): LeadCaptureRequest {
  return {
    email: email.trim(),
    form_name: "coming_soon_signup",
    landing_page: context.href,
    referrer: context.referrer || undefined,
    hostname: context.hostname,
    website,
  };
}

export async function submitLeadCapture(
  payload: LeadCaptureRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(LEAD_API_ROUTE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({ ok: response.ok }));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || "Request failed");
  }
}
