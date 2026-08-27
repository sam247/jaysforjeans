import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return new NextResponse("google.com, pub-3865452541027172, DIRECT, f08c47fec0942fa0\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
