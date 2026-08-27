import { describe, expect, it } from "vitest";

import { GET } from "@/app/ads.txt/route";

describe("ads.txt route", () => {
  it("publishes the authorised Google seller record", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("google.com, pub-3865452541027172, DIRECT, f08c47fec0942fa0\n");
  });
});
