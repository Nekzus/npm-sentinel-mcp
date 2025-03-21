# MCP Server Nekzus

[![Github Workflow](https://github.com/nekzus/mcp-server/actions/workflows/publish.yml/badge.svg?event=push)](https://github.com/Nekzus/mcp-server/actions/workflows/publish.yml)
[![npm-version](https://img.shields.io/npm/v/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-month](https://img.shields.io/npm/dm/@nekzus/mcp-server.svg)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![npm-total](https://img.shields.io/npm/dt/@nekzus/mcp-server.svg?style=flat)](https://www.npmjs.com/package/@nekzus/mcp-server)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square)](https://paypal.me/maseortega)

<div align="center">

**A Model Context Protocol (MCP) server that provides utility tools for
development and testing** </br>_This implementation is built on top of the
official MCP SDK and offers an extensible architecture for adding new tools_

</div>

## 🌟 Features

- 🔄 MCP Protocol Implementation
- 🛠️ Integrated Utility Tools
- 📝 Schema Validation with Zod
- 🚀 ESM Support
- 🔒 Strict TypeScript Types
- 🧩 Extensible Architecture for New Tools

## 📦 Installation

```bash
# Global installation (recommended for CLI usage)
npm install -g @nekzus/mcp-server

# Local installation
npm install @nekzus/mcp-server
```

## 🛠️ Available Tools

### 1. greeting

Generates a personalized greeting message.

**Parameters:**

- `name` (string): Recipient's name

**Example:**

```typescript
// Result: 👋 Hello John! Welcome to the MCP server!
{
  name: "John";
}
```

### 2. card

Gets a random card from a standard poker deck.

**Parameters:**

- No parameters required

**Example:**

```typescript
// Result: 🎴 You drew: Ace of ♠️ Spades
{}
```

### 3. datetime

Gets the current date and time for a specific timezone.

**Parameters:**

- `timeZone` (string, optional): Timezone identifier (e.g., "America/New_York")
- `locale` (string, optional): Locale identifier (e.g., "en-US")

**Example:**

```typescript
// Result: 
// 🗓️ Date: March 20, 2024
// ⏰ Time: 7:25:25 PM
// 🌍 Timezone: America/New_York
{
  timeZone: "America/New_York",
  locale: "en-US"
}
```

## 🚀 Usage

### As MCP Server

1. **Global Installation:**

```bash
npm install -g @nekzus/mcp-server
```

2. **Execution:**

```bash
npx @nekzus/mcp-server
```

### As a Dependency

```typescript
import { McpUtilityServer } from "@nekzus/mcp-server";

const server = new McpUtilityServer();
server.start();
```

## 🔧 Development

```bash
# Clone repository
git clone https://github.com/nekzus/mcp-server.git

# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Run
npm start
```

## 📁 Project Structure

```
src/
├── types/          # Type definitions
│   └── index.ts    # Shared types
├── utils/          # Utilities
│   ├── cards.ts    # Card functions
│   ├── datetime.ts # Date/time functions
│   └── schema.ts   # Schema conversion
├── tools/          # Tool implementations
│   └── index.ts    # Tools registry
└── index.ts        # Main entry point
```

## 🔍 Technical Details

- **Transport:** Uses `StdioServerTransport` for communication
- **Validation:** Converts JSON schemas to Zod for input validation
- **Types:** Fully typed implementation with TypeScript
- **Error Handling:** Robust error handling and resource cleanup
- **Signals:** Handles SIGTERM and SIGINT signals for graceful shutdown

## 📄 License

MIT © [nekzus]

## 👤 Author

**Nekzus**

- GitHub: [@nekzus](https://github.com/nekzus)

## 🌟 Support

Give a ⭐️ if this project helped you!
