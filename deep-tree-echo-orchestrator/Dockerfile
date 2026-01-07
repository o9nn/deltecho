# Deep Tree Echo Orchestrator Docker Configuration
# Phase 6: Production Integration
#
# This Dockerfile builds the orchestrator daemon with all three cognitive tiers:
# - Tier 1 (BASIC): Deep Tree Echo Core
# - Tier 2 (SYS6): Sys6-Triality 30-step cognitive cycle
# - Tier 3 (MEMBRANE): Double Membrane bio-inspired architecture

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files for dependency resolution
COPY packages/shared/package.json ./packages/shared/
COPY packages/cognitive/package.json ./packages/cognitive/
COPY packages/reasoning/package.json ./packages/reasoning/
COPY packages/sys6-triality/package.json ./packages/sys6-triality/
COPY packages/double-membrane/package.json ./packages/double-membrane/
COPY deep-tree-echo-core/package.json ./deep-tree-echo-core/
COPY deep-tree-echo-orchestrator/package.json ./deep-tree-echo-orchestrator/
COPY dove9/package.json ./dove9/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source files
COPY packages/ ./packages/
COPY deep-tree-echo-core/ ./deep-tree-echo-core/
COPY deep-tree-echo-orchestrator/ ./deep-tree-echo-orchestrator/
COPY dove9/ ./dove9/

# Build all packages
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 -S orchestrator && \
    adduser -u 1001 -S orchestrator -G orchestrator

WORKDIR /app

# Copy built artifacts and node_modules from build stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/deep-tree-echo-core ./deep-tree-echo-core
COPY --from=base /app/deep-tree-echo-orchestrator ./deep-tree-echo-orchestrator
COPY --from=base /app/dove9 ./dove9
COPY --from=base /app/package.json ./

# Create data directories
RUN mkdir -p /app/data/persistence /app/data/logs && \
    chown -R orchestrator:orchestrator /app

# Switch to non-root user
USER orchestrator

# Environment variables
ENV NODE_ENV=production
ENV ORCHESTRATOR_PERSISTENCE_PATH=/app/data/persistence
ENV ORCHESTRATOR_LOG_PATH=/app/data/logs

# Expose ports
# IPC Server
EXPOSE 9001
# Webhook Server
EXPOSE 9002
# Prometheus Metrics (future)
EXPOSE 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the orchestrator daemon
CMD ["node", "deep-tree-echo-orchestrator/dist/bin/daemon.js"]
