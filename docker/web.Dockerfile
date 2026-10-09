# Web: build the React SPA, then serve it with nginx, which also proxies /api to the API.
FROM docker.io/library/node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/content/package.json packages/content/
COPY packages/avatar/package.json packages/avatar/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root=false --no-audit --no-fund
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm run build -w apps/web

FROM docker.io/library/nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 5177
