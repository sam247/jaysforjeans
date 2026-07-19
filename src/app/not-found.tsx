import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-denim-dark via-background to-denim-mid px-6 py-16 text-foreground">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-primary">404</p>
        <h1 className="font-display text-4xl sm:text-5xl">Still getting stitched together</h1>
        <p className="max-w-md text-muted-foreground">
          That page does not exist yet, but the launch page is ready if you want to head
          back.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
