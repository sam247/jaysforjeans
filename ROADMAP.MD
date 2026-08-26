# Jays for Jeans Roadmap

## Current Status
- Replaced the coming-soon signup with a 30-second mobile-first arcade game.
- Added direct touch/drag and keyboard controls, progressive difficulty, golden Jays, generated sound, haptics, pause/resume, and instant replay.
- Added local personal bests and Vercel Analytics game events without collecting personal information.
- Added deterministic engine coverage and component tests for countdown, visibility pause, local preferences, and cleanup.
- Kept the game dependency-light with React UI around a native Canvas 2D game loop.

## Next Steps
- Consider a daily leaderboard only after persistent storage, score validation, nickname sanitisation, and rate limiting are available.
- Refresh the legacy ESLint setup to use the official Next.js configuration and remove warnings from unused shared UI files.
