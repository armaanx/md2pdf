FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS pruner
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN pnpm dlx turbo prune --scope=@md2pdf/web --docker

FROM base AS installer
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @md2pdf/db db:generate
RUN pnpm --filter @md2pdf/web build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=installer /app/apps/web/.next/standalone ./
COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer /app/apps/web/public ./apps/web/public
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages/renderer/node_modules ./packages/renderer/node_modules
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
