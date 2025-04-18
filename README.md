# NPM Analysis MCP Server

<div align="center">

[![Github Workflow](https://github.com/nekzus/mcp-server/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/Nekzus/mcp-server/actions/workflows/publish.yml)
[![npm-version](https://img.shields.io/npm/v/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-month](https://img.shields.io/npm/dm/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-total](https://img.shields.io/npm/dt/@nekzus/mcp-server.svg?style=flat)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square)](https://paypal.me/maseortega)

</div>

Node.js server implementing Model Context Protocol (MCP) for comprehensive NPM package analysis.

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
    "npmAnalyzer": {
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

Made by [nekzus](https://github.com/nekzus) • [Support Development](https://paypal.me/maseortega)
