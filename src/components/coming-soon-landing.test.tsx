import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComingSoonLanding } from "@/components/coming-soon-landing";
import { LEAD_API_ROUTE } from "@/lib/lead-capture";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ComingSoonLanding", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("submits the preserved lead payload and clears the email field", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<ComingSoonLanding />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "hello@example.com" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /notify me/i }).closest("form")!);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(endpoint).toBe(LEAD_API_ROUTE);
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(JSON.parse(options.body)).toMatchObject({
      email: "hello@example.com",
      form_name: "coming_soon_signup",
      hostname: "localhost",
      website: "",
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("your@email.com")).toHaveValue("");
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("shows an error toast when the request fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "Request failed" }),
    });

    render(<ComingSoonLanding />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "hello@example.com" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /notify me/i }).closest("form")!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
