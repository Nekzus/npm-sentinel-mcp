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

- 🔄 MCP Protocol Implementation with JSON-RPC 2.0
- 🛠️ Seven Integrated Utility Tools
- 📝 Input Schema Validation
- 🚀 ESM Support
- 🔒 Strict TypeScript Types
- 🧩 Extensible Tool Architecture
- 🔍 Detailed Error Handling
- 🎨 Emoji-Enhanced Output
- 🔐 Secure Expression Evaluation
- 📦 NPM Package Support

## 🛠️ Available Tools

### 1. greeting

Generates a personalized greeting message.

**Parameters:**

- `name` (string, required): Recipient's name

**Example:**

```typescript
// Input
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "greeting",
    "arguments": {
      "name": "John"
    }
  }
}

// Output
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "👋 Hello John! Welcome to the MCP server!"
    }],
    "isError": false
  }
}
```

### 2. card

Gets a random card from a standard poker deck.

**Parameters:**

- No parameters required

**Example:**

```typescript
// Input
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "card",
    "arguments": {}
  }
}

// Output
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "🎴 You drew: Ace of ♠ Spades"
    }],
    "isError": false
  }
}
```

### 3. datetime

Gets the current date and time for a specific timezone.

**Parameters:**

- `timeZone` (string, optional): Timezone identifier (e.g., "America/New_York")
- `locale` (string, optional): Locale identifier (e.g., "en-US")

**Example:**

```typescript
// Input
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "datetime",
    "arguments": {
      "timeZone": "America/New_York",
      "locale": "en-US"
    }
  }
}

// Output
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "🗓️ Date: March 24, 2024\n⏰ Time: 3:25:25 PM\n🌍 Timezone: America/New_York"
    }],
    "isError": false
  }
}
```

### 4. calculator

Performs mathematical calculations with support for basic and advanced operations.

**Parameters:**

- `expression` (string, required): Mathematical expression (e.g., "2 + 2 * 3")
- `precision` (number, optional): Decimal places in the result (default: 2)

**Example:**

```typescript
// Input
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "calculator",
    "arguments": {
      "expression": "2 + 2 * 3",
      "precision": 2
    }
  }
}

// Output
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "🧮 Expression: 2 + 2 * 3\n📊 Result: 8.00"
    }],
    "isError": false
  }
}
```

### 5. passwordGen

Generates secure passwords with customizable options.

**Parameters:**

- `length` (number, optional): Password length (default: 16)
- `includeNumbers` (boolean, optional): Include numbers (default: true)
- `includeSymbols` (boolean, optional): Include special characters (default: true)
- `includeUppercase` (boolean, optional): Include uppercase letters (default: true)

**Example:**

```typescript
// Input
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "passwordGen",
    "arguments": {
      "length": 12,
      "includeNumbers": true,
      "includeSymbols": true,
      "includeUppercase": true
    }
  }
}

// Output
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "🔐 Generated Password:\nKj2$mP9&vN4x\n\n📋 Password Properties:\n• Length: 12\n• Includes Numbers: ✅\n• Includes Symbols: ✅\n• Includes Uppercase: ✅"
    }],
    "isError": false
  }
}
```

### 6. qrGen

Generates QR codes for text or URLs.

**Parameters:**

- `text` (string, required): Text or URL to encode
- `size` (number, optional): Size in pixels (default: 200)
- `dark` (string, optional): Dark module color (default: "#000000")
- `light` (string, optional): Light module color (default: "#ffffff")

**Example:**

```typescript
// Input
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "qrGen",
    "arguments": {
      "text": "https://www.nekzus.dev",
      "size": 300,
      "dark": "#000000",
      "light": "#ffffff"
    }
  }
}

// Output
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "📱 QR Code Properties:\n• Content: https://www.nekzus.dev\n• Size: 300px\n• Dark Color: #000000\n• Light Color: #ffffff\n\n🔄 QR Code generation successful! (Implementation pending)"
    }],
    "isError": false
  }
}
```

### 7. kitchenConvert

Converts between common kitchen measurements and weights.

**Parameters:**

- `value` (number, required): Value to convert
- `from` (string, required): Source unit
- `to` (string, required): Target unit
- `ingredient` (string, optional): Ingredient for volume-to-weight conversions

**Supported Units:**

*Volume:*
- ml (milliliters)
- l (liters)
- cup (US cup)
- tbsp (tablespoon)
- tsp (teaspoon)
- floz (fluid ounce)

*Weight:*
- g (grams)
- kg (kilograms)
- oz (ounces)
- lb (pounds)

**Supported Ingredients:**
- water (density: 1.000 g/ml)
- milk (density: 1.030 g/ml)
- flour (density: 0.593 g/ml)
- sugar (density: 0.845 g/ml)
- brown sugar (density: 0.721 g/ml)
- salt (density: 1.217 g/ml)
- butter (density: 0.911 g/ml)
- oil (density: 0.918 g/ml)
- honey (density: 1.420 g/ml)
- maple syrup (density: 1.370 g/ml)

**Example:**

```typescript
// Input
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "kitchenConvert",
    "arguments": {
      "value": 1,
      "from": "cup",
      "to": "g",
      "ingredient": "flour"
    }
  }
}

// Output
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "🔄 Conversion Result:\n• 1 cup of flour = 140.30 g\n\n📝 Note: Conversion includes ingredient density"
    }],
    "isError": false
  }
}
```

## 🚀 Usage

### As CLI Tool

```bash
# Global Installation
npm install -g @nekzus/mcp-server

# Direct Execution
npx @nekzus/mcp-server

# Example Usage
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"greeting","arguments":{"name":"John"}}}' | npx @nekzus/mcp-server
```

## 🔧 Development

```bash
# Clone repository
git clone https://github.com/nekzus/mcp-server.git

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Format code
npm run format

# Lint code
npm run lint

# Check code
npm run check
```

## 📁 Project Structure

```
/
├── index.ts           # Main server implementation
├── package.json       # Project configuration
├── tsconfig.json     # TypeScript configuration
├── biome.json        # Biome configuration
├── jest.config.js    # Jest configuration
├── .github/          # GitHub workflows
│   └── workflows/    # CI/CD configuration
└── dist/            # Compiled JavaScript
```

## 🔍 Technical Details

- **Transport:** Uses `StdioServerTransport` for JSON-RPC communication
- **Input Validation:** Schema validation for tool arguments
- **Error Handling:** Comprehensive error handling with detailed messages
- **Security:** Safe expression evaluation in calculator tool
- **Types:** Full TypeScript type coverage
- **Testing:** Jest test framework integration
- **CI/CD:** Automated publishing with semantic-release
- **Formatting:** Biome for code formatting and linting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Nekzus**

- GitHub: [@nekzus](https://github.com/nekzus)
- PayPal: [Donate](https://paypal.me/maseortega)

## 🌟 Support

Give a ⭐️ if this project helped you!
