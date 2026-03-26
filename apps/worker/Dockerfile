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
RUN pnpm dlx turbo prune --scope=@md2pdf/worker --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ ./
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @md2pdf/db db:generate
RUN pnpm --filter @md2pdf/worker typecheck

FROM mcr.microsoft.com/playwright:v1.58.2-noble AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
COPY --from=installer /app ./
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD ["pnpm", "--filter", "@md2pdf/worker", "healthcheck"]
CMD ["pnpm", "--filter", "@md2pdf/worker", "start"]
