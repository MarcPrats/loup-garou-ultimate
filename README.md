# Loup Garou Ultimate

Loup Garou Ultimate V3 is the default application. It uses Vue 3, TypeScript, Pinia, Fastify, Socket.IO, shared contracts, and a shared deterministic game engine.

The original application remains in the repository and can still be started explicitly. No legacy HTML, CSS, JavaScript, image, dependency, or simulator file has been removed.

## Requirements

- Node.js 24 or later
- Corepack
- pnpm 10.28.2

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Development

Start the V3 server and Vite application together:

```bash
pnpm dev
```

- Vue application: `http://localhost:5173`
- V3 API and Socket.IO server: `http://localhost:3001`
- Health endpoint: `http://localhost:3001/api/health`

The dedicated simulator requires no backend:

```bash
pnpm simulator
```

It opens `http://localhost:5174/simulator` in a Vite mode without API or Socket.IO proxies.

## Production

Build and start the single-origin V3 application:

```bash
pnpm build
pnpm start
```

The Fastify server serves the built Vue application, the API, Socket.IO, SPA routes, the preserved rules pages, character pages, and their static assets from the same origin. The default port is `3001`.

See [V3 operations](docs/v3-operations.md) for environment variables, deployment files, health checks, graceful shutdown, and Codespaces instructions.

## Validation

```bash
pnpm typecheck:v3
pnpm test
pnpm build:v3
pnpm test:e2e
pnpm test:e2e:simulator
```

The browser suite builds and launches the real production server. It covers the original menu and rules, six isolated browser sessions, lobby restoration, game start, player and MJ views, fragment-based private access, DTO privacy, and the standalone simulator.

Install the Playwright browser once on a new machine:

```bash
pnpm exec playwright install chromium
```

## Legacy application

The legacy runtime is preserved and remains available through explicit commands:

```bash
pnpm start:legacy
pnpm dev:legacy
```

These commands run the existing root `server.js` and its existing HTML, CSS, JavaScript, assets, and static simulators. V3 is the default, but the legacy files have deliberately not been deleted.

## V3 architecture

```text
apps/
  server/             Fastify and Socket.IO production server
  web/                Vue 3 and Vite application
packages/
  contracts/          Shared validated transport contracts
  game-core/          Pure role assignment and seeded randomness
  game-projection/    Public, player, and MJ projections
e2e/                  Production and simulator browser tests
```

The server remains the authority for sessions and assignments. Player projections never contain hidden Ivrogne or Voyante-decoy fields. MJ projections contain the complete hidden state. Private role links place bearer tokens in URL fragments and exchange them through `no-store`, credential-free API requests.
