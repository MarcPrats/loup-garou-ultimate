FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/game-core/package.json packages/game-core/package.json
COPY packages/game-projection/package.json packages/game-projection/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:v3

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
RUN corepack enable
COPY --from=builder /app /app
EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
