FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 构建占位密钥不用于运行；正式密钥由容器环境提供。
RUN BETTER_AUTH_SECRET=build-only-placeholder-secret-at-least-32-characters DATABASE_PATH=/tmp/build.sqlite npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATABASE_PATH=/app/data/blog.sqlite UPLOADS_PATH=/app/uploads ADMIN_CREDENTIAL_FILE=/app/data/local-admin.txt
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/scripts/setup.ts ./scripts/setup.ts
COPY --from=builder --chown=node:node /app/src/lib/auth.ts /app/src/lib/auth-options.ts /app/src/lib/database.ts ./src/lib/
COPY --from=builder --chown=node:node /app/content ./content
RUN mkdir -p data uploads && chown node:node /app data uploads
USER node
EXPOSE 3000
CMD ["sh", "-c", "node --import tsx scripts/setup.ts && node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 3000"]
