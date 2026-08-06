# `@lgu/server`

The V3 Fastify and Socket.IO production server owns the in-memory lobby, session recovery, role assignment, private access tokens, public/player/MJ projections, static Vue delivery, and graceful shutdown.

## Commands

```bash
pnpm --filter @lgu/server dev
pnpm --filter @lgu/server typecheck
pnpm --filter @lgu/server test
pnpm --filter @lgu/server build
pnpm --filter @lgu/server start
```

The repository-level `pnpm start` command is the normal production entrypoint. Run `pnpm build` first so `apps/web/dist` exists.

## Environment

- `HOST`, default `0.0.0.0`
- `PORT`, default `3001`
- `WEB_ORIGIN`, default `http://localhost:5173`
- `WEB_ROOT`, optional absolute Vue build-directory override

`SIGINT` and `SIGTERM` call the idempotent runtime close function. The Fastify lifecycle clears the cleanup timer and closes Socket.IO.
