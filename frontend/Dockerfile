FROM node:24-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /frontend
COPY package.json pnpm-workspace.yaml .npmrc pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /frontend
# rewrites() is evaluated by `next build`, so the API origin is baked in here.
ARG API_URL=http://api:8000
ENV API_URL=$API_URL
COPY --from=deps /frontend/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /frontend
ENV NODE_ENV=production
RUN addgroup -S -g 10002 finance-tracker && adduser -S -u 10002 -G finance-tracker frontend

COPY --from=builder /frontend/public ./public
COPY --from=builder --chown=10002:10002 /frontend/.next ./.next
COPY --from=builder /frontend/node_modules ./node_modules
COPY --from=builder /frontend/package.json ./package.json

USER 10002:10002
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]