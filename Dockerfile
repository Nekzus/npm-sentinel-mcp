# Use Node.js LTS as the base image
FROM node:20-bookworm-slim

# Add metadata labels
LABEL maintainer="nekzus <nekzus.dev@gmail.com>"
LABEL name="@nekzus/mcp-server"
LABEL version="0.0.0-development"
LABEL description="MCP server for comprehensive NPM package analysis"

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false \
    npm_config_loglevel=error

# Copy package files first (for better layer caching)
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies and build
RUN npm ci && \
    # Create non-root user
    adduser --disabled-password --gecos "" nodeuser && \
    # Set ownership
    chown -R nodeuser:nodeuser /app

# Copy source code
COPY --chown=nodeuser:nodeuser . .

# Build the application
RUN npm run build && \
    # Clean up unnecessary files
    npm prune --production && \
    rm -rf src tests memory-bank *.ts && \
    rm -rf .git* .npm* .curse* .bio* && \
    rm -rf /root/.npm && \
    # Keep only necessary files
    find . -type f ! -name 'package*.json' ! -path './dist/*' ! -name 'README.md' ! -name 'LICENSE' -delete

# Switch to non-root user
USER nodeuser

# Expose port if needed (optional)
# EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "try { require('http').get('http://localhost:${PORT:-3000}/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)); } catch (e) { process.exit(1); }"

# Set entry point
ENTRYPOINT ["node", "dist/index.js"] 