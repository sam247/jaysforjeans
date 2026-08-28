import React from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/script", () => ({
  default: ({ id, children }: { id?: string; children?: string }) => (
    <script id={id}>{children}</script>
  ),
}));

describe("GoogleAnalytics", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing when measurement ID is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    const { GoogleAnalytics } = await import("@/components/google-analytics");
    const { container } = render(<GoogleAnalytics />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders GA scripts when measurement ID is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    const { GoogleAnalytics } = await import("@/components/google-analytics");
    const { container } = render(<GoogleAnalytics />);
    expect(container.querySelector("#google-analytics-init")).toBeTruthy();
  });
});
