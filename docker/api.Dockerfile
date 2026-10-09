# API: Fastify + the shared engine/content packages, run with tsx (no build step).
FROM docker.io/library/node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/content/package.json packages/content/
COPY packages/avatar/package.json packages/avatar/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace apps/api --include-workspace-root=false --no-audit --no-fund
COPY packages ./packages
COPY apps/api ./apps/api
COPY database ./database
ENV NODE_ENV=production PORT=3050
EXPOSE 3050
CMD ["node", "--import", "tsx", "apps/api/src/server.ts"]
