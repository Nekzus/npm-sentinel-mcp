# @nekzus/mcp-server

<div align="center">

[![Github Workflow](https://github.com/nekzus/mcp-server/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/Nekzus/mcp-server/actions/workflows/publish.yml)
[![npm-version](https://img.shields.io/npm/v/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-month](https://img.shields.io/npm/dm/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-total](https://img.shields.io/npm/dt/@nekzus/mcp-server.svg?style=flat)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square)](https://paypal.me/maseortega)

**A Model Context Protocol (MCP) server for comprehensive NPM package analysis** </br>
_Built on the MCP SDK, providing real-time insights into package quality, security, dependencies, and metrics_

[Features](#features) •
[Installation](#installation) •
[Usage](#usage) •
[API Reference](#api-reference) •
[Development](#development)

</div>

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Basic Usage](#basic-usage)
- [API Reference](#api-reference)
  - [Version Analysis](#version-analysis)
  - [Package Analysis](#package-analysis)
  - [Metrics Analysis](#metrics-analysis)
- [TypeScript Support](#typescript-support)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 📦 Version Analysis
- List all available package versions
- Get latest version details and changelog
- Track version history
- Analyze release patterns

### 🔍 Package Analysis
- Check dependencies and devDependencies
- Verify TypeScript support and types
- Analyze package size and bundle metrics
- Scan for security vulnerabilities
- Monitor security updates

### 📊 Metrics Analysis
- Track download trends and patterns
- Compare package metrics
- Evaluate quality scores
- Assess maintenance status
- Monitor popularity trends

### 🛠 Technical Features
- Full TypeScript support with type definitions
- Zero configuration required
- ESM support
- Real-time analysis
- Type-safe implementations
- Comprehensive error handling

## 🚀 Installation

```bash
# NPM
npm install @nekzus/mcp-server

# Yarn
yarn add @nekzus/mcp-server

# PNPM
pnpm add @nekzus/mcp-server
```

## 📖 Usage

### Configuration

#### With Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nekzus": {
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

### Basic Usage

```typescript
import { McpServer } from '@nekzus/mcp-server';

// The server automatically registers all available tools
const server = new McpServer({
  name: 'mcp-npm-tools',
  version: '1.0.0'
});

// Start receiving messages
await server.connect(new StdioServerTransport());
```

## 📚 API Reference

### Version Analysis

#### npmVersions
Get all available versions of a package.
```typescript
interface Input {
  packageName: string;
}
```

#### npmLatest
Get latest version info and changelog.
```typescript
interface Input {
  packageName: string;
}
```

### Package Analysis

#### npmDeps
Analyze package dependencies.
```typescript
interface Input {
  packageName: string;
}
```

#### npmTypes
Check TypeScript support.
```typescript
interface Input {
  packageName: string;
}
```

#### npmSize
Get package size metrics.
```typescript
interface Input {
  packageName: string;
}
```

#### npmVulnerabilities
Check security vulnerabilities.
```typescript
interface Input {
  packageName: string;
}
```

### Metrics Analysis

#### npmTrends
Get download trends.
```typescript
interface Input {
  packageName: string;
  period: "last-week" | "last-month" | "last-year";
}
```

#### npmCompare
Compare multiple packages.
```typescript
interface Input {
  packages: string[];
}
```

## 🔷 TypeScript Support

This package includes comprehensive TypeScript definitions. All tools and schemas are fully typed:

```typescript
import type {
  NpmPackageInfo,
  NpmPackageData,
  BundlephobiaData,
  NpmDownloadsData
} from '@nekzus/mcp-server';
```

## 🛠 Development

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

# Build for production
npm run build

# Start the server
node dist/index.js
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📫 Contact

- GitHub: [@nekzus](https://github.com/nekzus)
- Email: nekzus.dev@gmail.com

## ⭐️ Support

If you find this project helpful, please consider:
- Giving it a ⭐️ on GitHub
- [Supporting me on PayPal](https://paypal.me/maseortega)

---

Made by [nekzus](https://github.com/nekzus)
