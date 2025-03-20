# @nekzus/mcp-server

![License](https://img.shields.io/npm/l/@nekzus/mcp-server)
![Version](https://img.shields.io/npm/v/@nekzus/mcp-server)
![Downloads](https://img.shields.io/npm/dt/@nekzus/mcp-server)
![Node](https://img.shields.io/node/v/@nekzus/mcp-server)

A professional Model Context Protocol (MCP) server implementation providing
extensible utility functions and tools. This server serves as a personal toolset
that can be expanded with various functionalities.

## 🌟 Features

- 🎯 Type-safe implementation with TypeScript
- 🚀 Modern ESM support
- 🛠️ Extensible architecture
- 🔒 Strong typing and error handling
- 📦 Easy to integrate
- 🧪 Comprehensive testing
- 📚 Detailed documentation

## 📦 Installation

```bash
# Using npm
npm install @nekzus/mcp-server

# Using yarn
yarn add @nekzus/mcp-server

# Using pnpm
pnpm add @nekzus/mcp-server
```

## 🚀 Quick Start

### As a standalone server

```typescript
import { McpUtilityServer } from "@nekzus/mcp-server";

const server = new McpUtilityServer();
server.start();
```

### Using individual tools

```typescript
import { cardTool, greetingTool } from "@nekzus/mcp-server";

// Using the greeting tool
const greeting = await greetingTool.handler({ name: "John" });
console.log(greeting.content[0].text); // "Hello John from the MCP server!"

// Using the card tool
const card = await cardTool.handler();
console.log(card.content[0].text); // "Your card is: Ace of ♠️ Spades"
```

## 🛠️ Available Tools

### getSayHello

Generates a personalized greeting message.

**Parameters:**

- `name` (string): Name of the recipient

**Example:**

```typescript
/getSayHello name="John"
```

### getRandomCard

Randomly selects a card from a standard 52-card poker deck.

**Example:**

```typescript
/getRandomCard
```

## 🔧 Development

```bash
# Clone the repository
git clone https://github.com/nekzus/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Add your custom environment variables here
```

## 🏗️ Project Structure

```
@nekzus/mcp-server/
├── src/                  # Source code
│   ├── types/           # Type definitions
│   ├── utils/           # Utility functions
│   ├── tools/           # MCP tools implementations
│   └── index.ts         # Main entry point
├── tests/               # Test files
├── dist/                # Compiled code
└── docs/                # Documentation
```

## 📚 API Documentation

Detailed API documentation is available in the [docs](./docs) directory.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🙋‍♂️ Author

**Nekzus**

- GitHub: [@nekzus](https://github.com/nekzus)
- NPM: [@nekzus](https://www.npmjs.com/~nekzus)

## 🌟 Support

Give a ⭐️ if this project helped you!
