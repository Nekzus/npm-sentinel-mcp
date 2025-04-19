FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json .npmrc ./

# Delete prepare script to avoid git hooks
RUN npm pkg delete scripts.prepare

# Install all dependencies for building
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Final stage
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files
COPY package*.json .npmrc ./
RUN npm pkg delete scripts.prepare && \
    npm ci --omit=dev && \
    npm cache clean --force && \
    rm -rf /root/.npm

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY llms.txt llms-full.txt ./

# Ensure proper permissions and security
RUN chown -R node:node /app && \
    chmod +x dist/*.js && \
    # Add sh for Smithery requirement
    apk add --no-cache sh && \
    # Clean up
    rm -rf /var/cache/apk/*

# Set user for security
USER node

# Start the MCP server
CMD ["node", "dist/index.js"] 