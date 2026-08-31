import type { Metadata } from "next";

import { JaysGame } from "@/components/jays-game";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <JaysGame />;
}
