FROM node:20-alpine AS builder
# Set working directory
WORKDIR /app
RUN yarn global add pnpm turbo
COPY . .
RUN turbo prune --scope=api-gateway --docker

# Add lockfile and package.json's of isolated subworkspace
FROM node:20-alpine AS installer
WORKDIR /app
RUN yarn global add pnpm
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=api-gateway...

FROM node:20-alpine AS runner
WORKDIR /app
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

COPY --from=installer /app .
WORKDIR /app/apps/api-gateway

CMD ["node", "dist/index.js"]
