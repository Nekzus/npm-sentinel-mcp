# NPM Sentinel MCP

<div align="center">

[![smithery badge](https://smithery.ai/badge/@Nekzus/npm-sentinel-mcp)](https://smithery.ai/server/@Nekzus/npm-sentinel-mcp)
[![Github Workflow](https://github.com/nekzus/NPM-Sentinel-MCP/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/Nekzus/npm-sentinel-mcp/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-month](https://img.shields.io/npm/dm/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-total](https://img.shields.io/npm/dt/@nekzus/mcp-server.svg?style=flat)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![Docker Hub](https://img.shields.io/docker/pulls/mcp/npm-sentinel.svg?label=Docker%20Hub)](https://hub.docker.com/r/mcp/npm-sentinel)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Nekzus/npm-sentinel-mcp)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square)](https://paypal.me/maseortega)

</div>

A powerful Model Context Protocol (MCP) server that revolutionizes NPM package analysis through AI. Built to integrate with Claude and Anthropic AI, it provides real-time intelligence on package security, dependencies, and performance. This MCP server delivers instant insights and smart analysis to safeguard and optimize your npm ecosystem, making package management decisions faster and safer for modern development workflows.

## Features

- **Version analysis and tracking**
- **Dependency analysis and mapping**
- **Advanced Security Scanning**: Recursive dependency checks, ecosystem awareness (e.g., React), and accurate version resolution.
- **Package quality metrics**
- **Download trends and statistics**
- **TypeScript support verification**
- **Package size analysis**
- **Maintenance metrics**
- **Real-time package comparisons**
- **Standardized error handling and MCP response formats**
- **Efficient caching for improved performance and API rate limit management**
- **Rigorous schema validation and type safety using Zod**

Note: The server provides AI-assisted analysis through MCP integration.

## Caching and Invalidation

To ensure data accuracy while maintaining performance, the server implements robust caching strategies:
- **Automatic Invalidation**: The cache is automatically invalidated whenever `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock` changes in your workspace. This ensures you always get fresh data after installing or updating dependencies.
- **Force Refresh**: All tools accept an optional `ignoreCache: true` parameter to bypass the cache and force a fresh lookup from the registry.

### Example Usage (JSON-RPC)

When calling a tool, simply include `ignoreCache: true` in the arguments:

```json
{
  "name": "npmVersions",
  "arguments": {
    "packages": ["react"],
    "ignoreCache": true
  }
}
```

## Installation

### Migration to HTTP Streamable

This MCP server now supports both STDIO and HTTP streamable transport. Your existing STDIO configuration will continue to work without changes.

**New capabilities:**
- HTTP streamable transport via Smithery.ai
- Enhanced scalability and performance
- Interactive testing playground

**Development commands:**
```bash
# Development server with playground
npm run dev

# Build for HTTP
npm run build:http

# Start HTTP server
npm run start:http
```

### Install in VS Code

[<img alt="Install in VS Code (npx)" src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20NPM%20Sentinel%20MCP&color=0098FF">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522npm-sentinel%2522%252C%2522config%2522%253A%257B%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522%2540nekzus%252Fmcp-server%2540latest%2522%255D%257D%257D)
[<img alt="Install in VS Code Insiders (npx)" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20NPM%20Sentinel%20MCP&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522npm-sentinel%2522%252C%2522config%2522%253A%257B%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522-y%2522%252C%2522%2540nekzus%252Fmcp-server%2540latest%2522%255D%257D%257D)

Add this to your VS Code MCP config file. See [VS Code MCP docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers) for more info.

```json
{
  "servers": {
    "npm-sentinel": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@nekzus/mcp-server@latest"]
    }
  }
}
```

### Smithery.ai Deployment (HTTP Streamable)

This MCP server now supports HTTP streamable transport through Smithery.ai for enhanced scalability and performance. You can deploy it directly on Smithery.ai:
**Benefits of HTTP deployment:**
- **Scalable**: Handles multiple concurrent connections
- **Streamable**: Real-time streaming responses
- **Managed**: Automatic deployment and monitoring
- **Backward Compatible**: Still supports STDIO for local development
- **Interactive Testing**: Built-in playground for testing tools

**Configuration for Smithery.ai:**
```json
{
  "mcpServers": {
    "npm-sentinel": {
      "type": "http",
      "url": "https://smithery.ai/server/@Nekzus/npm-sentinel-mcp"
    }
  }
}
```

### Configuration

The server supports the following configuration options:

| Environment Variable | CLI Argument | Default | Description |
| -------------------- | ------------ | ------- | ----------- |
| `NPM_REGISTRY_URL` | `config.NPM_REGISTRY_URL` | `https://registry.npmjs.org` | URL of the NPM registry to use for all requests |

#### HTTP Deployment (Smithery/Docker)

When deploying via Smithery or Docker, you can configure these options in your configuration file:

```json
{
  "mcpServers": {
    "npm-sentinel": {
      "type": "http",
      "url": "https://smithery.ai/server/@Nekzus/npm-sentinel-mcp",
      "config": {
        "NPM_REGISTRY_URL": "https://registry.npmjs.org"
      }
    }
  }
}
```
### Docker

#### Build
```bash
# Build the Docker image
docker build -t nekzus/npm-sentinel-mcp .
```

#### Usage

You can run the MCP server using Docker with directory mounting to `/projects`:

```json
{
  "mcpServers": {
    "npm-sentinel-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-w", "/projects",
        "--mount", "type=bind,src=${PWD},dst=/projects",
        "nekzus/npm-sentinel-mcp",
        "node",
        "dist/index.js"
      ]
    }
  }
}
```

For multiple directories:

```json
{
  "mcpServers": {
    "npm-sentinel-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-w", "/projects",
        "--mount", "type=bind,src=/path/to/workspace,dst=/projects/workspace",
        "--mount", "type=bind,src=/path/to/other/dir,dst=/projects/other/dir,ro",
        "nekzus/npm-sentinel-mcp",
        "node",
        "dist/index.js"
      ]
    }
  }
}
```

Note: All mounted directories must be under `/projects` for proper access.

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "npmsentinel": {
      "command": "npx",
      "args": ["-y", "@nekzus/mcp-server@latest"]
    }
  }
}
```

Configuration file locations:
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: (Claude for Desktop does not officially support Linux at this time)

### NPX

<!-- [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.png)](cursor://anysphere.cursor-deeplink/mcp/install?name=npm-sentinel-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBuZWt6dXMvbWNwLXNlcnZlckBsYXRlc3QiXX0=) -->

```json
{
  "mcpServers": {
    "npm-sentinel-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@nekzus/mcp-server@latest"
      ]
    }
  }
}
```

## API

The server exposes its tools via the Model Context Protocol. All tools adhere to a standardized response format:
```json
{
  "content": [
    {
      "type": "text",
      "text": "string",
      "isError": boolean // Optional
    }
    // ... more content items if necessary
  ]
}
```

### Resources

- `npm://registry`: NPM Registry interface
- `npm://security`: Security analysis interface
- `npm://metrics`: Package metrics interface

### Server Resources

The server also provides the following informational resources accessible via MCP `GetResource` requests:

- `doc://server/readme`:
  - **Description**: Retrieves the main `README.md` file content for this NPM Sentinel MCP server.
  - **MIME Type**: `text/markdown`
- `doc://mcp/specification`:
  - **Description**: Retrieves the `llms-full.txt` content, providing the comprehensive Model Context Protocol specification.
  - **MIME Type**: `text/plain`

### Tools

#### npmVersions
- Get all versions of a package
- Input: `packages` (string[])
- Returns: Version history with release dates

#### npmLatest
- Get latest version information
- Input: `packages` (string[])
- Returns: Latest version details and changelog

#### npmDeps
- Analyze package dependencies
- Input: `packages` (string[])
- Returns: Complete dependency tree analysis

#### npmTypes
- Check TypeScript support
- Input: `packages` (string[])
- Returns: TypeScript compatibility status

#### npmSize
- Analyze package size
- Input: `packages` (string[])
- Returns: Bundle size and import cost analysis

#### npmVulnerabilities
- Scan for security vulnerabilities
- Features: 
  - **Transitive Scanning**: Checks dependencies up to depth 2.
  - **Ecosystem Awareness**: Automatically scans related packages (e.g., React Server Components).
  - **Rich Reports**: Includes CVE IDs and full summaries.
- Input: `packages` (string[])
- Returns: Detailed security advisories, CVEs, and severity ratings

#### npmTrends
- Get download trends
- Input:
  - `packages` (string[])
  - `period` ("last-week" | "last-month" | "last-year")
- Returns: Download statistics over time

#### npmCompare
- Compare multiple packages
- Input: `packages` (string[])
- Returns: Detailed comparison metrics

#### npmMaintainers
- Get package maintainers
- Input: `packages` (string[])
- Returns: Maintainer information and activity

#### npmScore
- Get package quality score
- Input: `packages` (string[])
- Returns: Comprehensive quality metrics

#### npmPackageReadme
- Get package README
- Input: `packages` (string[])
- Returns: Formatted README content

#### npmSearch
- Search for packages
- Input:
  - `query` (string)
  - `limit` (number, optional)
- Returns: Matching packages with metadata

#### npmLicenseCompatibility
- Check license compatibility
- Input: `packages` (string[])
- Returns: License analysis and compatibility info

#### npmRepoStats
- Get repository statistics
- Input: `packages` (string[])
- Returns: GitHub/repository metrics

#### npmDeprecated
- Check for deprecation
- Input: `packages` (string[])
- Returns: Deprecation status and alternatives

#### npmChangelogAnalysis
- Analyze package changelogs
- Input: `packages` (string[])
- Returns: Changelog summaries and impact analysis

#### npmAlternatives
- Find package alternatives
- Input: `packages` (string[])
- Returns: Similar packages with comparisons

#### npmQuality
- Assess package quality
- Input: `packages` (string[])
- Returns: Quality metrics and scores

#### npmMaintenance
- Check maintenance status
- Input: `packages` (string[])
- Returns: Maintenance activity metrics

## Build

```bash
# Install dependencies
npm install

# Build for STDIO (traditional)
npm run build:stdio

# Build for HTTP (Smithery)
npm run build:http

# Development server
npm run dev
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

---

MIT © [nekzus](https://github.com/nekzus)