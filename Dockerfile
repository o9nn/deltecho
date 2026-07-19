# Deltecho Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY deep-tree-echo-core/package.json ./deep-tree-echo-core/
COPY deep-tree-echo-orchestrator/package.json ./deep-tree-echo-orchestrator/
COPY packages/shared/package.json ./packages/shared/
COPY dove9/package.json ./dove9/
COPY packages/eventa/package.json ./packages/eventa/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY deep-tree-echo-core/ ./deep-tree-echo-core/
COPY deep-tree-echo-orchestrator/ ./deep-tree-echo-orchestrator/
COPY packages/shared/ ./packages/shared/
COPY dove9/ ./dove9/
COPY packages/eventa/ ./packages/eventa/

# Build packages in dependency order
RUN pnpm --filter deep-tree-echo-core build && \
    pnpm --filter @deltecho/shared build && \
    pnpm --filter dove9 build && \
    pnpm --filter @deltecho/eventa build && \
    pnpm --filter deep-tree-echo-orchestrator build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate

# Create non-root user
RUN addgroup -g 1001 -S deltecho && \
    adduser -S deltecho -u 1001

# Copy built packages
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/deep-tree-echo-core/dist ./deep-tree-echo-core/dist
COPY --from=builder /app/deep-tree-echo-core/package.json ./deep-tree-echo-core/
COPY --from=builder /app/deep-tree-echo-orchestrator/dist ./deep-tree-echo-orchestrator/dist
COPY --from=builder /app/deep-tree-echo-orchestrator/package.json ./deep-tree-echo-orchestrator/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/dove9/dist ./dove9/dist
COPY --from=builder /app/dove9/package.json ./dove9/
COPY --from=builder /app/packages/eventa/dist ./packages/eventa/dist
COPY --from=builder /app/packages/eventa/package.json ./packages/eventa/

# Set ownership
RUN chown -R deltecho:deltecho /app

# Switch to non-root user
USER deltecho

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Expose ports
EXPOSE 3000 9876

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start orchestrator
CMD ["node", "deep-tree-echo-orchestrator/dist/index.js"]
