FROM mcr.microsoft.com/playwright:v1.55.0-noble

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web ./apps/web
COPY apps/worker ./apps/worker
COPY packages ./packages
COPY scripts ./scripts
COPY .env.example ./.env.example
COPY docker-compose.yml ./docker-compose.yml

RUN npm ci
RUN npm run db:generate
RUN npm run build --workspace @md2pdf/worker

CMD ["npm", "run", "start", "--workspace", "@md2pdf/worker"]
