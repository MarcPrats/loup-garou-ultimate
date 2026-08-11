# Loup Garou Ultimate

Loup Garou Ultimate is a Vue 3 and TypeScript application powered by Fastify, Socket.IO, shared contracts, and a deterministic game engine.

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

The simulator is available as a normal public route during development and production:

```text
http://localhost:5173/simulator
```

It uses synthetic local data and does not initialize a session, API, or Socket.IO connection. A link is also available from the home page.

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

The server remains the authority for sessions and assignments. MJ projections contain the complete hidden state. Private role links place bearer tokens in URL fragments and exchange them through `no-store`, credential-free API requests.

## GitHub Pages static site

The GitHub Pages workflow builds a static mode containing the home page, `/rules`, role details, and the external Wiki link. It hides the game entry button and does not initialize the API or Socket.IO client. The multiplayer game still requires the Fastify server.

The workflow uses `VITE_BASE_PATH` for project-site assets and copies the Vue entry point to `404.html` so direct `/rules` and role-detail links work on GitHub Pages.

## Install requirements

# Node
sudo apk add --no-cache nodejs npm

node --version
npm --version

sudo npm install --global pnpm@10.28.2

pnpm --version
pnpm install
