# Jays for Jeans Roadmap

## Current Status
- Completed the migration from the original single-page app to a Next.js App Router project.
- Preserved the logo asset, branded color system, headline styling, floating-shirt animations, and staged entrance motion.
- Refreshed the site favicon in `public/favicon.ico`.
- Added Vercel Analytics for basic visitor tracking through the shared app layout.
- Kept the external lead-capture connector and the same payload contract, including the hidden honeypot field, with a Next.js route fallback for deployment resilience.
- Added a branded `not-found` route and focused test coverage for the signup flow.
- Verified the project with `npm run test` and `npm run build`.

## Next Steps
- Replace placeholder social icon buttons with live profile URLs when the accounts are available.
- Refresh the legacy ESLint setup to use the official Next.js configuration and remove leftover warnings from unused shared UI files.
- Add deployment environment documentation if the form connector ever moves behind a server-side route.
