# Loup Garou Ultimate

Loup Garou Ultimate is a Vue 3 and TypeScript application powered by Pinia, Fastify, Socket.IO, shared contracts, and a deterministic game engine.

## Requirements

- Node.js 24 or later
- Corepack
- pnpm 10.28.2

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Development

Start the Fastify server and Vite application together:

```bash
pnpm dev
```

- Vue application: `http://localhost:5173`
- API and Socket.IO server: `http://localhost:3001`
- Health endpoint: `http://localhost:3001/api/health`

The isolated simulator runs without a backend:

```bash
pnpm simulator
```

It opens `http://localhost:5174/simulator` in a Vite mode without API or Socket.IO proxies.

## Production

Build and start the single-origin application:

```bash
pnpm build
pnpm start
```

Fastify serves the built Vue application, the API, Socket.IO, SPA routes, rules, role details, and image assets from the same origin. The default port is `3001`.

See [operations](docs/v3-operations.md) for environment variables, deployment files, health checks, graceful shutdown, and Codespaces instructions.

## Validation

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:e2e:simulator
```

Install the Playwright browser once on a new machine:

```bash
pnpm exec playwright install chromium
```

## Architecture

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
