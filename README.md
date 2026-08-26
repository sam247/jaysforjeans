# Jays for Jeans

A mobile-first 30-second canvas arcade game: catch as many falling Jays as possible in a pair of jeans.

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
- Personal best and mute preference are device-local; there is no account or signup flow.
- A public leaderboard is intentionally deferred until persistent storage and server-side score safeguards are available.
