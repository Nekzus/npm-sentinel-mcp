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

A powerful **Model Context Protocol (MCP v2)** server built on `@modelcontextprotocol/server` and `@modelcontextprotocol/core` (v2) that revolutionizes NPM package analysis through AI. Built to integrate seamlessly with Claude, Anthropic AI, and any MCP v2 compatible client, it provides real-time intelligence on package security, dependencies, and performance.

This server features **Modular ESM Architecture (`src/`)**, **Dual Output Protocol Returns (`content` + `structuredContent`)**, **Zod Output Schemas (`outputSchema`)**, **Embedded SVG Data URI Icons**, and **Real-Time Context Logging**.

## Key Features

- **MCP v2 Native Protocol**: Fully upgraded to MCP v2 with `outputSchema` Zod validation, dual `structuredContent` returning, and diagnostic context logging (`ctx.mcpReq.log`).
- **Self-Contained Vector Icons**: Pre-configured SVG Data URIs (`data:image/svg+xml`) embedded across all 19 tools, resources, and prompts for enhanced client UI presentation.
- **Advanced Security Scanning**: Recursive dependency checks powered by Google's `deps.dev` and OSV.dev, ecosystem awareness, and accurate version resolution.
- **Smart Alternatives Filtering (`npmAlternatives`)**: Intelligent search based on functional domain keywords with strict ecosystem plugin/extension filtering (e.g., excludes `express-rate-limit` when searching for alternatives to `express`).
- **Strict Input Validation**: Protection against Path Traversal, SSRF, and Command Injection via rigorous input sanitization (`isValidNpmPackageName`).
- **Dependency & Transitive Mapping**: Complete dependency tree analysis mapping through `deps.dev`.
- **Package Quality & Maintenance Metrics**: Real-time scoring using OpenSSF Scorecard, GitHub repository metrics, and npms.io.
- **Download Trends & Performance**: Real-time download statistics and bundle size analysis.
- **Efficient Caching System**: Automated cache invalidation on workspace lockfile changes (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`) with manual bypass (`ignoreCache: true`).

## Caching and Invalidation

To ensure data accuracy while maintaining high performance:
- **Automatic Invalidation**: The cache is automatically invalidated whenever `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock` changes in your workspace.
- **Force Refresh**: All tools accept an optional `ignoreCache: true` parameter to bypass the cache and force a fresh lookup from the NPM registry.

### Example Usage (JSON-RPC)

```json
{
  "name": "npmVersions",
  "arguments": {
    "packages": ["react"],
    "ignoreCache": true
  }
}
```

## Installation & Transports

### STDIO & Streamable HTTP Transports

This MCP server supports both **STDIO** (standard input/output) and **Streamable HTTP / SSE** transports out of the box.

- **STDIO Mode**: Default transport for local execution via `npx` or Docker.
- **Streamable HTTP / SSE Mode**: Decoupled `createServer({ config })` factory exported from `dist/index.js` and `dist/src/server.js` for mounting on Express, Hono, Cloudflare Workers, or Smithery.ai.

**Development Commands:**
```bash
# Install dependencies
pnpm install

# Compile TypeScript to dist/
pnpm run build

# Start STDIO server
pnpm run start

# Development server with Smithery CLI playground
pnpm run dev

# Run unit and integration test suite (212+ tests)
pnpm test -- --run

# Run full E2E tarball verification
node __tests__/full-e2e-pack-validation.js
```

### Install in VS Code / Cursor

Add this to your VS Code / Cursor MCP configuration:

```json
{
  "inputs": [],
  "servers": {
    "npm-sentinel": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@nekzus/mcp-server@latest"]
    }
  }
}
```

### Install in Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "npm-sentinel": {
      "command": "npx",
      "args": ["-y", "@nekzus/mcp-server@latest"]
    }
  }
}
```

**Configuration File Locations:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

### Smithery.ai Deployment

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

### Docker Usage

```bash
# Build Docker image
docker build -t nekzus/npm-sentinel-mcp .

# Run with local volume mount
docker run -i --rm -w /projects -v ${PWD}:/projects nekzus/npm-sentinel-mcp node dist/index.js
```

## Configuration

The server supports the following configuration parameters:

| Environment Variable | Config Object Property | Default | Description |
| -------------------- | ---------------------- | ------- | ----------- |
| `NPM_REGISTRY_URL` | `config.NPM_REGISTRY_URL` | `https://registry.npmjs.org` | URL of the NPM registry to use for all requests |

---

## MCP Server Capabilities (v2 API)

All tool responses conform to the MCP v2 dual output format, providing both human-readable text in `content` and parsed JSON objects in `structuredContent`:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"queryPackages\": [\"express\"],\n  \"results\": [...]\n}"
    }
  ],
  "structuredContent": {
    "queryPackages": ["express"],
    "results": [...]
  }
}
```

### Server Resources

Accessible via MCP `readResource` requests:

- `doc://server/readme`
  - **Description**: Main documentation file for NPM Sentinel MCP server.
  - **MIME Type**: `text/markdown`
  - **Icon**: Embedded Document SVG Data URI.
- `doc://mcp/specification`
  - **Description**: Complete Model Context Protocol specification file (`llms-full.txt`).
  - **MIME Type**: `text/plain`
  - **Icon**: Embedded Document SVG Data URI.

### Server Prompts

Accessible via MCP `getPrompt` requests:

- `analyze-package`
  - **Description**: Generates a comprehensive prompt template for AI analysis of an NPM package including security, performance, dependencies, and health metrics.
  - **Arguments**: `package` (string, required)
  - **Icon**: Embedded Security SVG Data URI.

---

### Tools Catalog (19 Tools)

All 19 tools define `inputSchema`, `outputSchema`, `annotations` (`title`, `readOnlyHint`), and `icons`:

#### 1. `npmLatest`
- Get latest version information, release dates, SRI integrity hashes, and dist-tags.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 2. `npmVersions`
- Get full version history with release dates and deprecation statuses.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 3. `npmDeps`
- Complete dependency tree analysis including direct dependencies and full transitive graph mapping via `deps.dev`.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 4. `npmTypes`
- Verify TypeScript support (native `index.d.ts` declaration files vs `@types/*` DefinitelyTyped packages).
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 5. `npmSize`
- Package bundle size, minified size, and gzip impact analysis.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 6. `npmVulnerabilities`
- Instant transitive vulnerability scanning powered by Google's `deps.dev` and OSV.dev advisories.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 7. `npmTrends`
- Historical download statistics over customizable time ranges (`last-week`, `last-month`, `last-year`).
- **Input**: `packages` (`string[]`), `period` (`"last-week"` \| `"last-month"` \| `"last-year"`), `ignoreCache` (`boolean`, optional)

#### 8. `npmCompare`
- Side-by-side metric comparison across multiple packages.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 9. `npmMaintainers`
- List of package maintainers, public emails, and publishing activity.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 10. `npmScore`
- Consolidated score combining quality, popularity, maintenance, and OpenSSF Scorecard.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 11. `npmPackageReadme`
- Retrieve full formatted raw README markdown content from NPM registry / CDN.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 12. `npmSearch`
- Search NPM registry packages by query with rich metadata (scores, publisher, keywords).
- **Input**: `query` (`string`), `limit` (`number`, optional)

#### 13. `npmLicenseCompatibility`
- Analyze license compatibility across multiple packages (MIT, Apache-2.0, GPL, etc.).
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 14. `npmRepoStats`
- Repository statistics (GitHub stars, forks, open issues) combined with OpenSSF Scorecard checks.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 15. `npmDeprecated`
- Detect deprecation status on package and recursive sub-dependencies.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 16. `npmChangelogAnalysis`
- Extract release notes and GitHub release history.
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 17. `npmAlternatives`
- Smart functional alternative suggestions filtering out ecosystem plugins (e.g. excludes `express-rate-limit` for `express`).
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 18. `npmQuality`
- Package code quality score (0–1).
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

#### 19. `npmMaintenance`
- Package maintenance activity score (0–1).
- **Input**: `packages` (`string[]`), `ignoreCache` (`boolean`, optional)

---

## License

This MCP server is licensed under the MIT License. See [LICENSE](LICENSE) for details.

MIT © [nekzus](https://github.com/nekzus)