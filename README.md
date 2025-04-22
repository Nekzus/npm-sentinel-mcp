# NPM Sentinel MCP

<div align="center">

[![Github Workflow](https://github.com/nekzus/NPM-Sentinel-MCP/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/Nekzus/npm-sentinel-mcp/actions/workflows/publish.yml)
[![npm-version](https://img.shields.io/npm/v/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-month](https://img.shields.io/npm/dm/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-total](https://img.shields.io/npm/dt/@nekzus/mcp-server.svg?style=flat)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![smithery badge](https://smithery.ai/badge/@Nekzus/npm-sentinel-mcp)](https://smithery.ai/server/@Nekzus/npm-sentinel-mcp)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square)](https://paypal.me/maseortega)

</div>

<a href="https://glama.ai/mcp/servers/@Nekzus/npm-sentinel-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Nekzus/npm-sentinel-mcp/badge" alt="NPM Sentinel MCP badge" />
</a>

A powerful Model Context Protocol (MCP) server that revolutionizes NPM package analysis through AI. Built to integrate with Claude and Anthropic AI, it provides real-time intelligence on package security, dependencies, and performance. This MCP server delivers instant insights and smart analysis to safeguard and optimize your npm ecosystem, making package management decisions faster and safer for modern development workflows.

## Features

- Version analysis and tracking
- Dependency analysis and mapping
- Security vulnerability scanning
- Package quality metrics
- Download trends and statistics
- TypeScript support verification
- Package size analysis
- Maintenance metrics
- Real-time package comparisons

Note: The server provides AI-assisted analysis through MCP integration.

## API

### Resources

- `npm://registry`: NPM Registry interface
- `npm://security`: Security analysis interface
- `npm://metrics`: Package metrics interface

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
- Input: `packages` (string[])
- Returns: Security advisories and severity ratings

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

## Docker

### Build
```bash
# Build the Docker image
docker build -t nekzus/npm-sentinel-mcp .
```

### Usage

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

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "npmAnalyzer": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@nekzus/mcp-server"]
    }
  }
}
```

Configuration file locations:
- Windows: `%APPDATA%/claude-desktop/claude_desktop_config.json`
- macOS: `~/Library/Application Support/claude-desktop/claude_desktop_config.json`
- Linux: `~/.config/claude-desktop/claude_desktop_config.json`

## NPX

```json
{
  "mcpServers": {
    "npm-sentinel-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@nekzus/mcp-server"
      ]
    }
  }
}
```

## Build

```bash
# Build with npm
npm install
npm run build
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

---

MIT © [nekzus](https://github.com/nekzus)