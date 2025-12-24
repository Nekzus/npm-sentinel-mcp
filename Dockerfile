# Custom Dockerfile for Smithery Cloud to handle missing system dependencies
FROM node:22-bookworm-slim

WORKDIR /app

# Install libsecret for @smithery/cli (keytar dependency) and build tools
# Smithery's default image lacks this, causing ERR_DLOPEN_FAILED
# We need libsecret-1-dev and build-essential to compile keytar
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsecret-1-0 \
    libsecret-1-dev \
    build-essential \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# REMOVED --ignore-scripts so keytar can be built
RUN npm install

COPY . .

# Build the project using our robust script
RUN npm run build:http

# Smithery Cloud expects the server to listen on PORT
ENV PORT=8000
EXPOSE 8000

# Start the certified server
CMD ["npm", "run", "start:http"]