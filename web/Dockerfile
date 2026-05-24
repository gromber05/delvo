FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
RUN npm install -g pnpm@10.21.0
COPY web/package.json ./
COPY web/pnpm-lock.yaml* ./
RUN pnpm install --shamefully-hoist --frozen-lockfile 2>/dev/null || pnpm install --shamefully-hoist

FROM base AS builder
WORKDIR /app
RUN npm install -g pnpm@10.21.0
COPY --from=deps /app/node_modules ./node_modules
COPY web/. .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
