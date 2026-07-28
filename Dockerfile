# Multi-stage Dockerfile for @nekzus/mcp-server (NPM Sentinel MCP v2)
# Optimized for minimal image size, security, and fast builds with pnpm & Node 22

# ----- Stage 1: Builder -----
FROM node:22-alpine AS builder

WORKDIR /app

# Enable Corepack for pnpm activation
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency manifests and TypeScript config first to leverage Docker Layer Caching
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install native build tools (python3, make, g++) for native bindings if required
RUN apk add --no-cache python3 make g++ libsecret-dev

# Install all dependencies (including devDependencies) for compilation
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code and documentation assets
COPY index.ts ./
COPY src ./src
COPY server.json smithery.yaml ./
COPY README.md LICENSE llms-full.txt ./

# Compile TypeScript to JavaScript (dist/)
RUN pnpm run build

# ----- Stage 2: Production -----
FROM node:22-alpine AS production

LABEL maintainer="Nekzus Solutions <nekzus.dev@gmail.com>"
LABEL description="@nekzus/mcp-server - NPM Sentinel MCP Server (MCP v2 Specification)"
LABEL org.opencontainers.image.source="https://github.com/Nekzus/npm-sentinel-mcp"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Enable Corepack for pnpm activation
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests and compiled dist artifacts from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.json ./
COPY --from=builder /app/README.md /app/LICENSE /app/llms-full.txt ./

# Install production-only dependencies and prune pnpm store cache
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

# Enforce non-root user execution for container security
USER node

# Startup command (Run the STDIO MCP server)
CMD ["node", "dist/index.js"]