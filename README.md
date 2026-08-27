# Jays for Jeans

A mobile-first canvas survival game: clear increasingly frantic 12-second Jay-catching levels for as long as your jeans can cope.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Canvas 2D and Web Audio
- Vercel Analytics
- Vitest

## Development

```sh
npm install
npm run dev
```

## Production

```sh
npm run build
npm run start
```

## Project Notes

- The original yellow/red logo and dark-blue visual direction are preserved.
- Gameplay uses a lightweight deterministic simulation with a high-DPI canvas renderer.
- Highest level, best-run details, and mute preference are device-local; there is no account or signup flow.
- The optional Surrey Quays leaderboard activates when Upstash Redis and a signing secret are configured; gameplay is independent of it.

## Optional Leaderboard

Copy `.env.example` to `.env.local` and configure either the Upstash Redis REST variables or equivalent `KV_REST_API_URL` / `KV_REST_API_TOKEN` values, plus a long random `LEADERBOARD_SIGNING_SECRET`. The API validates run age, level targets, progress, cumulative Jays, and submission bounds; it allows one submission per signed run, sanitises nicknames, and whitelists board identifiers. Rankings use highest level, then progress in the failed level, then total Jays.
