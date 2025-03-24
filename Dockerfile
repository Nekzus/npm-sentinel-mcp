# Use Node.js 22 slim image as base
FROM node:22-bookworm-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    npm_config_update_notifier=false \
    npm_config_fund=false

# Copy all source code
COPY . .

# Install dependencies, build and clean up
RUN npm ci && \
    npm run build && \
    npm prune --production && \
    rm -rf src tsconfig.json .npmrc .gitignore && \
    rm -rf /root/.npm

# Set entry point
ENTRYPOINT ["node", "dist/index.js"] 