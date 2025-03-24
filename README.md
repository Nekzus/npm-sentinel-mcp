# Nekzus MCP Server

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

## Components

### Tools

- **greeting**
  - Generate personalized greeting messages
  - Input: `name` (string, required): Name of the recipient
  - Example:
    ```json
    {"name": "John"} -> "👋 Hello John! Welcome to the MCP server!"
    ```

- **card**
  - Draw random cards from a standard 52-card poker deck
  - Input: No parameters required
  - Example:
    ```json
    {} -> "🎴 Drew card: A♠️" (random from 52 cards)
    ```

- **datetime**
  - Get formatted date/time for any timezone
  - Inputs:
    - `timeZone` (string, optional, default: "UTC"): Timezone identifier
    - `locale` (string, optional, default: "en-US"): Locale for formatting
  - Example:
    ```json
    {"timeZone": "America/New_York", "locale": "es-ES"} -> 
    "🕒 domingo, 24 de marzo de 2024, 15:25:25 hora de verano del este"
    ```

- **calculator**
  - Perform mathematical calculations
  - Inputs:
    - `expression` (string, required): Mathematical expression to evaluate
    - `precision` (number, optional, default: 2): Number of decimal places
  - Supported operations: +, -, *, /, %, (), .
  - Example:
    ```json
    {"expression": "2 + 2 * 3", "precision": 2} -> "🔢 Result: 8.00"
    {"expression": "(15 / 2) % 2", "precision": 3} -> "🔢 Result: 1.500"
    ```

- **passwordGen**
  - Generate secure passwords with customizable options
  - Inputs:
    - `length` (number, optional, default: 16): Password length
    - `includeNumbers` (boolean, optional, default: true): Include numbers
    - `includeSymbols` (boolean, optional, default: true): Include special symbols
    - `includeUppercase` (boolean, optional, default: true): Include uppercase letters
  - Example:
    ```json
    {"length": 12, "includeSymbols": true} -> "🔐 Generated: Kj2$mP9&vN4x"
    {"length": 8, "includeNumbers": false} -> "🔐 Generated: KjMpNvXw"
    ```

- **qrGen**
  - Generate QR codes for text or URLs
  - Inputs:
    - `text` (string, required): Text or URL to encode
    - `size` (number, optional, default: 200): Size in pixels
    - `dark` (string, optional, default: "#000000"): Color for dark modules
    - `light` (string, optional, default: "#ffffff"): Color for light modules
  - Output: Returns a Data URL containing the QR code image
  - Example:
    ```json
    // Basic Usage
    {"text": "https://github.com/nekzus"} -> 
    "📱 QR Code generated successfully!
     Properties:
     • Content: https://github.com/nekzus
     • Size: 200px
     • Dark Color: #000000
     • Light Color: #ffffff
     
     QR Code (Data URL):
     data:image/png;base64,..."

    // Custom Size and Colors
    {
      "text": "Hello World!",
      "size": 300,
      "dark": "#FF0000",
      "light": "#FFFFFF"
    } -> 
    "📱 QR Code generated successfully!
     Properties:
     • Content: Hello World!
     • Size: 300px
     • Dark Color: #FF0000
     • Light Color: #FFFFFF
     
     QR Code (Data URL):
     data:image/png;base64,..."
    ```

  **Note:** The QR code is returned as a Data URL that can be used directly in HTML `<img>` tags or converted to a file.

- **kitchenConvert**
  - Convert between kitchen measurements
  - Inputs:
    - `value` (number, required): Value to convert
    - `from` (string, required): Source unit
    - `to` (string, required): Target unit
    - `ingredient` (string, optional): Ingredient for accurate conversion
  
  **Supported Units:**
  
  *Volume Units:*
  ```
  - ml    (milliliters)
  - l     (liters)
  - cup   (US cup = 236.588 ml)
  - tbsp  (US tablespoon = 14.787 ml)
  - tsp   (US teaspoon = 4.929 ml)
  - floz  (US fluid ounce = 29.574 ml)
  ```

  *Weight Units:*
  ```
  - g     (grams)
  - kg    (kilograms)
  - oz    (ounces = 28.350 g)
  - lb    (pounds = 453.592 g)
  ```

  **Ingredient Densities:**
  ```
  - water        (1.000 g/ml)
  - milk         (1.030 g/ml)
  - flour        (0.593 g/ml)
  - sugar        (0.845 g/ml)
  - brown_sugar  (0.721 g/ml)
  - salt         (1.217 g/ml)
  - butter       (0.911 g/ml)
  - oil          (0.918 g/ml)
  - honey        (1.420 g/ml)
  - maple_syrup  (1.370 g/ml)
  ```

  Examples:
  ```json
  // Volume to Volume
  {"value": 1, "from": "cup", "to": "ml"} -> 
  "⚖️ 1 cup = 236.59 ml"

  // Weight to Weight
  {"value": 500, "from": "g", "to": "lb"} -> 
  "⚖️ 500 g = 1.10 lb"

  // Volume to Weight (requires ingredient)
  {"value": 1, "from": "cup", "to": "g", "ingredient": "flour"} -> 
  "⚖️ 1 cup of flour = 140.30 g"
  ```

## Key Features

- Zero configuration required
- JSON-RPC 2.0 compliant
- Type-safe implementations
- Emoji-enhanced responses
- Comprehensive error handling
- ESM support
- Full TypeScript types
- Docker support

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

Build the Docker image:

```bash
# Build the image
docker build -t nekzus/mcp-server .

# Run the container
docker run -i --rm --init nekzus/mcp-server
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using commitizen (`npm run commit`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.

## Author

👤 **nekzus**

* GitHub: [@Nekzus](https://github.com/Nekzus)

## Show your support

Give a ⭐️ if this project helped you!
