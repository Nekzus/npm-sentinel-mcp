# @nekzus/mcp-server

[![Github Workflow](https://github.com/nekzus/mcp-server/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/Nekzus/mcp-server/actions/workflows/publish.yml)
[![npm-version](https://img.shields.io/npm/v/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-month](https://img.shields.io/npm/dm/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-total](https://img.shields.io/npm/dt/@nekzus/mcp-server.svg?style=flat)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square)](https://paypal.me/maseortega)

<div align="center">

**A Model Context Protocol (MCP) server for comprehensive NPM package analysis** </br>
_Built on the MCP SDK, providing real-time insights into package quality, security, dependencies, and metrics_

</div>

<a href="https://glama.ai/mcp/servers/@Nekzus/mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Nekzus/mcp-server/badge" alt="Utility Server MCP server" />
</a>

## Features

- **Version Analysis**
  - List all available package versions
  - Get latest version details
  - Track version history
  - Analyze release patterns

- **Package Analysis**
  - Check dependencies and devDependencies
  - Verify TypeScript support
  - Analyze package size and dependencies
  - Scan for vulnerabilities
  - Monitor security updates

- **Metrics Analysis**
  - Track download trends
  - Compare package metrics
  - Evaluate quality scores
  - Assess maintenance status
  - Monitor popularity trends

## Tools

### Version Analysis Tools

- **npmVersions**
  - Get all available versions of a package
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Lists all react versions
    ```

- **npmLatest**
  - Get latest version info and changelog
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Latest version details
    ```

### Package Analysis Tools

- **npmDeps**
  - Analyze package dependencies
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Dependencies breakdown
    ```

- **npmTypes**
  - Check TypeScript support
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> TypeScript support info
    ```

- **npmSize**
  - Get package size metrics
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Size and dependency info
    ```

- **npmVulnerabilities**
  - Check security vulnerabilities
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Security vulnerabilities
    ```

### Metrics Analysis Tools

- **npmTrends**
  - Get download trends
  - Inputs:
    - `packageName` (string, required)
    - `period` (string, optional): "last-week" | "last-month" | "last-year"
  - Example:
    ```json
    {
      "packageName": "react",
      "period": "last-month"
    } -> Download trends data
    ```

- **npmCompare**
  - Compare multiple packages
  - Input: `packages` (string[], required)
  - Example:
    ```json
    {
      "packages": ["react", "vue", "angular"]
    } -> Comparative metrics
    ```

- **npmQuality**
  - Get quality metrics
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Quality score details
    ```

- **npmMaintenance**
  - Get maintenance metrics
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Maintenance status
    ```

- **npmPopularity**
  - Get popularity metrics
  - Input: `packageName` (string, required)
  - Example:
    ```json
    {"packageName": "react"} -> Popularity metrics
    ```

## Key Features

- Real-time package analysis
- Comprehensive security scanning
- Detailed dependency tracking
- TypeScript support verification
- Performance metrics monitoring
- Zero configuration required
- Type-safe implementations
- Full TypeScript declarations
- Docker support
- ESM support

## Installation

```bash
# NPM
npm install @nekzus/mcp-server

# Yarn
yarn add @nekzus/mcp-server

# PNPM
pnpm add @nekzus/mcp-server
```

## Configuration

To use this server with the Claude Desktop app, add the following configuration to the "mcpServers" section of your `claude_desktop_config.json`:

### NPX (Recommended)

```json
{
  "mcpServers": {
    "nekzus": {
      "transport": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@nekzus/mcp-server"
      ]
    }
  }
}
```

### Docker

```json
{
  "mcpServers": {
    "nekzus": {
      "transport": "stdio",
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "nekzus/mcp-server"]
    }
  }
}
```

The configuration file is typically located at:
- Windows: `%APPDATA%/claude-desktop/claude_desktop_config.json`
- macOS: `~/Library/Application Support/claude-desktop/claude_desktop_config.json`
- Linux: `~/.config/claude-desktop/claude_desktop_config.json`

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm run test

# Build
npm run build
```

## Docker

Build and run the Docker image:

```bash
# Build the image
docker build -t nekzus/mcp-server .

# Run the container
docker run -i --rm --init nekzus/mcp-server
```

## Requirements

- Node.js >= 18
- npm >= 9

## License

MIT © [nekzus](https://github.com/nekzus)