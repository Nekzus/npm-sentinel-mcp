# MCP Package Analyzer - Intelligent NPM Analysis Server

<div align="center">

[![Github Workflow](https://github.com/nekzus/mcp-server/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/Nekzus/mcp-server/actions/workflows/publish.yml)
[![npm-version](https://img.shields.io/npm/v/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-month](https://img.shields.io/npm/dm/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-total](https://img.shields.io/npm/dt/@nekzus/mcp-server.svg?style=flat)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square)](https://paypal.me/maseortega)

<h2>🤖 Model Context Protocol Server for NPM Analysis</h2>

**AI-Powered Analysis • MCP Integration • Package Intelligence**

_Advanced NPM package analysis through Model Context Protocol (MCP) for AI-assisted development_

<hr>

<h3>🔗 MCP-Ready • 📊 AI-Enhanced • 🚀 Real-Time Analysis</h3>

_Seamlessly integrate NPM package analysis with Claude and other AI assistants through MCP_

[Key Features](#key-features) •
[Quick Start](#quick-start) •
[Documentation](#documentation) •
[Examples](#examples) •
[Support](#support)

</div>

## 🚀 Installation & Setup

### Using with MCP Inspector

```bash
# Inspect the server using MCP Inspector
npx @modelcontextprotocol/inspector npx -y @nekzus/mcp-server

# For local development
npx @modelcontextprotocol/inspector node path/to/server/index.js
```

### Direct Installation

```bash
# Using npm
npm install @nekzus/mcp-server

# Using yarn
yarn add @nekzus/mcp-server

# Using pnpm
pnpm add @nekzus/mcp-server
```

## 📖 MCP Configuration

### With Claude or other AI Assistants

Add to your configuration file (`claude_desktop_config.json` or similar):

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

### Basic Usage as MCP Server

```typescript
import { McpServer } from '@nekzus/mcp-server';

// Initialize MCP server with required metadata
const server = new McpServer({
  name: 'npm-analyzer',
  version: '1.0.0',
  description: 'MCP-compliant NPM package analysis server'
});

// Connect using MCP stdio transport
await server.connect(new StdioServerTransport());

// Server automatically registers all available NPM analysis tools
// and handles MCP protocol communication
```

### Development Testing

For development and testing:

1. Start the server in development mode
2. Use MCP Inspector to verify:
   - Tool availability and schemas
   - Response formats
   - Error handling
3. Test with Claude or other AI assistants

```bash
# Test with MCP Inspector during development
npx @modelcontextprotocol/inspector node ./dist/index.js

# Monitor server logs and tool execution
```

## 🎯 What is @nekzus/mcp-server?

@nekzus/mcp-server is a specialized server implementation that provides deep insights into NPM packages through the Model Context Protocol (MCP). It offers a comprehensive suite of analysis tools designed to help developers make informed decisions about package selection, security, and maintenance.

### 🌟 Why Choose This Package?

- **Comprehensive Analysis**: Get detailed insights into package quality, security, dependencies, and usage metrics
- **Real-Time Data**: Access up-to-date information directly from npm and related services
- **Batch Processing**: Analyze multiple packages simultaneously for efficient comparisons
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **MCP Integration**: Seamless integration with Claude and other AI assistants through MCP
- **Performance Focused**: Optimized for speed with concurrent processing and caching capabilities

## 📊 Key Features

### 📦 Package Intelligence
- **Version Analysis**
  - Track all available versions and release patterns
  - Get detailed changelogs and version histories
  - Monitor latest releases and updates
  - Compare version differences

- **Dependency Analysis**
  - Map complete dependency trees
  - Identify potential conflicts
  - Track outdated dependencies
  - Analyze peer dependencies
  - Check for circular dependencies

- **Security Assessment**
  - Scan for known vulnerabilities
  - Monitor security advisories
  - Track patch availability
  - Assess dependency security
  - Get severity ratings

### 🔍 Quality Metrics
- **Code Quality**
  - Maintenance scores
  - Code coverage metrics
  - Documentation quality
  - Type definitions status
  - Best practices compliance

- **Community Health**
  - Download trends
  - GitHub activity
  - Contributor metrics
  - Issue response times
  - Release frequency

- **Performance Metrics**
  - Bundle size analysis
  - Tree-shaking effectiveness
  - Runtime performance
  - Memory footprint
  - Load time impact

### 🛠 Technical Capabilities
- **Multi-Package Processing**
  - Concurrent analysis
  - Batch comparisons
  - Aggregate metrics
  - Cross-package insights

- **Data Integration**
  - NPM Registry
  - GitHub API
  - Security Databases
  - Download Statistics
  - Quality Metrics

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install @nekzus/mcp-server

# Using yarn
yarn add @nekzus/mcp-server

# Using pnpm
pnpm add @nekzus/mcp-server
```

### Basic Usage

```typescript
import { McpServer } from '@nekzus/mcp-server';

// Initialize the server
const server = new McpServer({
  name: 'npm-analysis',
  version: '1.0.0'
});

// Start the server with stdio transport
await server.connect(new StdioServerTransport());
```

## 📖 Documentation

### Tool Categories

#### 1. Version Analysis Tools
```typescript
// Get all versions of a package
const versions = await npmVersions({ packageName: 'react' });

// Get latest version details
const latest = await npmLatest({ packageName: 'express' });
```

#### 2. Package Analysis Tools
```typescript
// Check dependencies
const deps = await npmDeps({ packageName: 'next' });

// Verify TypeScript support
const types = await npmTypes({ packageName: 'lodash' });
```

#### 3. Metrics Analysis Tools
```typescript
// Compare multiple packages
const comparison = await npmCompare({ 
  packages: ['react', 'preact', 'vue'] 
});

// Get download trends
const trends = await npmTrends({ 
  packages: ['axios', 'fetch'],
  period: 'last-month'
});
```

## 🎯 Examples

### Analyzing Multiple Packages
```typescript
// Compare security of multiple packages
const security = await npmVulnerabilities({
  packages: ['express', 'fastify', 'koa']
});

// Get quality metrics for frameworks
const quality = await npmQuality({
  packages: ['next', 'nuxt', 'remix']
});
```

### Tracking Package Health
```typescript
// Get comprehensive package score
const score = await npmScore({
  packageName: 'react'
});

// Check maintenance status
const maintenance = await npmMaintenance({
  packageName: 'typescript'
});
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📫 Contact & Support

- **GitHub**: [@nekzus](https://github.com/nekzus)
- **Email**: nekzus.dev@gmail.com
- **Support**: [PayPal](https://paypal.me/maseortega)

## ⭐️ Show Your Support

If you find this project helpful, please consider:
- Giving it a star on GitHub
- Sharing it with others
- [Supporting the development](https://paypal.me/maseortega)

---

Made by [nekzus](https://github.com/nekzus)
