# V3 Operations

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run V3 server and Vite development application |
| `pnpm build` | Build the V3 server and Vue application |
| `pnpm start` | Start the built single-origin V3 production server |
| `pnpm simulator` | Run the isolated local simulator without a backend |
| `pnpm test` | Run legacy and V3 unit/integration suites |
| `pnpm test:e2e` | Run the production browser flow |
| `pnpm test:e2e:simulator` | Run the standalone simulator browser flow |
| `pnpm start:legacy` | Start the preserved legacy runtime |
| `pnpm dev:legacy` | Start the preserved legacy runtime with nodemon |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `HOST` | `0.0.0.0` | V3 server bind address |
| `PORT` | `3001` | V3 server port |
| `WEB_ORIGIN` | `http://localhost:5173` | Allowed browser origin for split development. In single-origin production, set it to the public HTTPS origin. |
| `WEB_ROOT` | `apps/web/dist` | Optional absolute override for the built Vue directory |
| `VITE_ENABLE_SIMULATOR` | unset | Explicitly include `/simulator` in a non-development web build |

Copy `.env.example` when a platform supports environment files. Do not commit real secrets or private role tokens.

## Production behavior

`pnpm build` creates:

- `apps/server/dist/index.js`
- `apps/web/dist/`

`pnpm start` runs the Fastify server. It serves API and Socket.IO traffic first, then existing static files, then `index.html` for extensionless Vue SPA routes. Missing assets and unknown `/api` routes remain 404 responses and are never replaced by the SPA shell.

The rules page is now the public Vue route `/reference`, composed from reusable rules components. The old `/reference.html` URL redirects to it. The preserved `role.html`, CSS, JavaScript, and `images/` files remain available for legacy character detail pages and assets.

## Graceful shutdown

The V3 entrypoint listens for `SIGINT` and `SIGTERM`. Shutdown is idempotent and performs one Fastify close operation. The room cleanup timer is cleared and Socket.IO closes through the Fastify lifecycle hook before the process exits. A failed shutdown sets a non-zero process exit code.

## Health check

Use:

```text
GET /api/health
```

A healthy process returns HTTP 200 with the V3 application identifier and current timestamp.

## Deployment

The repository includes:

- `Dockerfile` for a Node 24 multi-stage V3 build.
- `Procfile` for platforms that consume a process declaration. `heroku-postbuild` builds V3 before the process starts.
- `nixpacks.toml` for pnpm-based Nixpacks builds.
- `render.yaml` for Render deployment and `/api/health` checks.

All deployment paths run `pnpm build:v3` before launching `node apps/server/dist/index.js` directly, so platform signals reach the V3 graceful-shutdown handlers. The legacy runtime and files remain in the image and repository but are not the default process.

## Codespaces

`.devcontainer/devcontainer.json` installs Node 24, enables Corepack, installs the frozen pnpm workspace, and forwards:

- `3001`, V3 backend or production server
- `5173`, Vite development application
- `5174`, standalone simulator test server

Run `pnpm dev` in the Codespaces terminal. Port `5173` opens as a preview. For the simulator, run `pnpm simulator` and open the forwarded simulator port.

## Browser tests

Install Chromium once:

```bash
pnpm exec playwright install chromium
```

Then run:

```bash
pnpm test:e2e
pnpm test:e2e:simulator
```

The main E2E test uses port `3101` and an in-memory room. It is intentionally single-worker and has no automatic retry because retrying against the same already-started room would not be isolated.
