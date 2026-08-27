# Jays for Jeans Roadmap

## Current Status
- Converted score attack into an endless level-survival run with immediate target clears, 12-second levels, hand-tuned opening stages, and generated late-game pressure.
- Added direct touch/drag and keyboard controls, animated jeans reactions, generated sound, haptics, pause/resume, and instant replay.
- Added highest-level personal bests and level-aware Vercel Analytics without collecting personal information.
- Added deterministic coverage for target clears, Golden +5 overshoots, transitions, timer failure, generated levels, leaderboard ranking, pause, preferences, analytics deduplication, and cleanup.
- Adapted the optional daily, weekly, and all-time leaderboard to rank level, failed-level progress, and total Jays with signed runs and server-side sanity validation.
- Kept the game dependency-light with React UI around a native Canvas 2D game loop and REST-backed storage.

## Next Steps
- Configure Upstash Redis and `LEADERBOARD_SIGNING_SECRET` in Vercel to activate the leaderboard in production.
- Refresh the legacy ESLint setup to use the official Next.js configuration and remove warnings from unused shared UI files.
