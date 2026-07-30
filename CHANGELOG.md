# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.25.0-alpha.7](https://github.com/Nekzus/npm-sentinel-mcp/compare/1.25.0-alpha.6...1.25.0-alpha.7) (2026-07-30)

### Bug Fixes

* **ci:** format release headers with version numbers ([6469b06](https://github.com/Nekzus/npm-sentinel-mcp/commit/6469b067286d14cc909b9226e247a5e99752956f))

## [1.25.0-alpha.6](https://github.com/Nekzus/npm-sentinel-mcp/compare/1.25.0-alpha.5...1.25.0-alpha.6) (2026-07-30)

### Bug Fixes

* **ci:** test verified release signature with signed commit ([eac0833](https://github.com/Nekzus/npm-sentinel-mcp/commit/eac0833d8cb8aef1c9f4eb82e9c489320bc33574))

## [1.25.0-alpha.5](https://github.com/Nekzus/npm-sentinel-mcp/compare/1.25.0-alpha.4...1.25.0-alpha.5) (2026-07-29)

### Bug Fixes

* **ci:** verify automated release signature flow ([bb0af45](https://github.com/Nekzus/npm-sentinel-mcp/commit/bb0af4510b79ce15b1663a036cd3b316d89cc1f2))

## [1.25.0-alpha.4](https://github.com/Nekzus/npm-sentinel-mcp/compare/1.25.0-alpha.3...1.25.0-alpha.4) (2026-07-29)

### Features

* **config:** add glama.json schema and update package.json files ([6cc139b](https://github.com/Nekzus/npm-sentinel-mcp/commit/6cc139bb460f7ee3b6a81dcb6ae17d8522c2cf83))

## [1.25.0-alpha.3](https://github.com/Nekzus/npm-sentinel-mcp/compare/1.25.0-alpha.2...1.25.0-alpha.3) (2026-07-29)

### Bug Fixes

* **ci:** match semantic-release committer email with gpg key for verified releases in alpha ([b7d68ff](https://github.com/Nekzus/npm-sentinel-mcp/commit/b7d68ff977c8e3dfef75706fc0ff906b425cf820))

## [1.25.0-alpha.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.25.0-alpha.1...1.25.0-alpha.2) (2026-07-29)

### Bug Fixes

* **ci:** add GIT_EDITOR to bypass prompt during signed tag creation in alpha ([0ea1f21](https://github.com/Nekzus/npm-sentinel-mcp/commit/0ea1f2108b56ccf29078795d76cc27bcd68126fa))
* **ci:** use commit gpg signing for semantic-release compatibility in alpha ([2f04fa0](https://github.com/Nekzus/npm-sentinel-mcp/commit/2f04fa010f5e6f4a42b09edf0fe8f77266c8f63f))

## [1.25.0-alpha.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.24.1...v1.25.0-alpha.1) (2026-07-29)

# [1.19.0-alpha.24](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.23...v1.19.0-alpha.24) (2026-07-28)


### Bug Fixes

* **http:** import WebStandardStreamableHTTPServerTransport directly from @modelcontextprotocol/server ([76ee68c](https://github.com/Nekzus/npm-sentinel-mcp/commit/76ee68c8a092c220ca157b38cbf81bef884b6acc))

# [1.19.0-alpha.23](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.22...v1.19.0-alpha.23) (2026-07-24)


### Features

* **security:** implement search query sanitization, batch size limits and server instructions ([c2838eb](https://github.com/Nekzus/npm-sentinel-mcp/commit/c2838ebedbd9446475616e5a4a4c2ccacb993d67))

# [1.19.0-alpha.22](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.21...v1.19.0-alpha.22) (2026-07-23)


### Bug Fixes

* **zod:** replace deprecated .passthrough() with .loose() for Zod v4 schemas ([7351447](https://github.com/Nekzus/npm-sentinel-mcp/commit/7351447e8315bce58a490227b0b5cd7215b26d28))

# [1.19.0-alpha.21](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.20...v1.19.0-alpha.21) (2026-07-23)


### Features

* **security:** refactor OWASP LLM01 directive into MCP server global instructions ([af85a7b](https://github.com/Nekzus/npm-sentinel-mcp/commit/af85a7b40fcae2e4623b9b4367db796d040a4ed4))

# [1.19.0-alpha.20](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.19...v1.19.0-alpha.20) (2026-07-22)


### Features

* **resolver:** implement smart SemVer shorthand resolution for version queries ([915ec50](https://github.com/Nekzus/npm-sentinel-mcp/commit/915ec50817cf3b381ef0b07850f66ce6ef00ce13))

# [1.19.0-alpha.19](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.18...v1.19.0-alpha.19) (2026-07-22)


### Features

* **security:** implement OWASP LLM01 indirect prompt injection mitigations via XML demarcation and _meta flags ([8f88f9f](https://github.com/Nekzus/npm-sentinel-mcp/commit/8f88f9f2f910475fcce51328f5d80e024ea2d86e))

# [1.19.0-alpha.18](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.17...v1.19.0-alpha.18) (2026-07-22)


### Bug Fixes

* **linter:** use modern Object.hasOwn instead of Object.prototype.hasOwnProperty.call in index.ts and src/http.ts ([bef70c1](https://github.com/Nekzus/npm-sentinel-mcp/commit/bef70c1c490ac3523ed855a330abb2b120c1bb48))

# [1.19.0-alpha.17](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.16...v1.19.0-alpha.17) (2026-07-22)


### Features

* **resolver:** add smart SemVer shorthand & range resolution (`express@2`, `v4`, `4.x`, `^4`, `~4.18`) across all version handlers ([915ec50](https://github.com/Nekzus/npm-sentinel-mcp/commit/915ec50))

### Bug Fixes

* **security:** prevent prototype property collisions (e.g. constructor) across ECOSYSTEM_MAP, KNOWN_ALTERNATIVES_MAP, TOOL_HANDLERS_MAP, and version objects ([3f24e57](https://github.com/Nekzus/npm-sentinel-mcp/commit/3f24e57ca8756209a3c412cc98632d62745d625f))

# [1.19.0-alpha.16](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.15...v1.19.0-alpha.16) (2026-07-20)


### Bug Fixes

* **linter:** resolve unused options parameter, import sorting, and template literal linter issues in src/http.ts ([79409e7](https://github.com/Nekzus/npm-sentinel-mcp/commit/79409e798062846857ff5258889c026823f2b522))

# [1.19.0-alpha.15](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.14...v1.19.0-alpha.15) (2026-07-20)


### Features

* **http:** export stateless Streamable HTTP POST transport handler for Cloudflare Workers and web servers ([07918fe](https://github.com/Nekzus/npm-sentinel-mcp/commit/07918fefc5a1a9479728bb9e14f3df0b48efc426))

# [1.19.0-alpha.14](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.13...v1.19.0-alpha.14) (2026-07-20)


### Bug Fixes

* **scorecard:** condition Scorecard reason sanitization strictly to score -1 and internal errors ([1180548](https://github.com/Nekzus/npm-sentinel-mcp/commit/118054845eb40e07db3f4cc4fb8b9a47c5eb61f2))

# [1.19.0-alpha.13](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.12...v1.19.0-alpha.13) (2026-07-20)


### Bug Fixes

* **scorecard:** sanitize internal error messages from OpenSSF Scorecard API ([323f19e](https://github.com/Nekzus/npm-sentinel-mcp/commit/323f19e0eac985ee6da931bc715609a96f14f1de))

# [1.19.0-alpha.12](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.11...v1.19.0-alpha.12) (2026-07-19)


### Features

* **audit:** enrich npmRepoStats with live GitHub metadata, extract OSV severity levels, and sanitize Scorecard reasons ([c164afa](https://github.com/Nekzus/npm-sentinel-mcp/commit/c164afa78de20a74f94a8f0ea4ac86c374ae129b))

# [1.19.0-alpha.11](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.10...v1.19.0-alpha.11) (2026-07-19)


### Bug Fixes

* **audit:** resolve npmVulnerabilities summary output schema and improve npmAlternatives recommendation engine ([bb215cb](https://github.com/Nekzus/npm-sentinel-mcp/commit/bb215cbecd7df37c840a66188b499a94180b5241))

# [1.19.0-alpha.10](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.9...v1.19.0-alpha.10) (2026-07-19)


### Bug Fixes

* **lint:** clean unused imports and improve optional chaining in index.ts ([a4d0bfb](https://github.com/Nekzus/npm-sentinel-mcp/commit/a4d0bfb12322873251460506b2bd0fb169aa32bc))
* **lint:** organize imports and setNpmRegistryUrl export in index.ts ([c49950a](https://github.com/Nekzus/npm-sentinel-mcp/commit/c49950a90566a5371c3b1ccdbe6f5dd4b6652896))
* **lint:** use optional chaining in handleNpmAlternatives keyword check ([059ca7d](https://github.com/Nekzus/npm-sentinel-mcp/commit/059ca7d639d3bc2bc50fe852066af992ca82951a))
* **test:** remove unused imports in cache-invalidation.test.ts ([56184b3](https://github.com/Nekzus/npm-sentinel-mcp/commit/56184b3df58eac618e0b6f055f10e04ccf45840e))


### Features

* **audit:** refine npmAlternatives filtering and standardize empty-array error schema ([4b67a74](https://github.com/Nekzus/npm-sentinel-mcp/commit/4b67a74d3d0af0a8817ab8f52a8b7cf4fb63c9cc))
* **mcp:** add SVG Data URI icons and context logging to tools, resources and prompts ([76b83a2](https://github.com/Nekzus/npm-sentinel-mcp/commit/76b83a21d3ae86bdb126d1e28ae0b834ae2ac4f7))
* **mcp:** implement outputSchema and structuredContent for all 19 tools ([e16f21d](https://github.com/Nekzus/npm-sentinel-mcp/commit/e16f21da0cda32b81cd3bbda897168d448fd1a75))

# [1.19.0-alpha.9](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.8...v1.19.0-alpha.9) (2026-07-19)


### Bug Fixes

* **ci:** restore NPM_TOKEN and registry-url in publish workflow ([e5ae865](https://github.com/Nekzus/npm-sentinel-mcp/commit/e5ae865fcf7910132cf25cbf35f28c19f1f57580))

# [1.19.0-alpha.8](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.7...v1.19.0-alpha.8) (2026-07-19)


### Bug Fixes

* **ci:** configure npm OIDC publishing by removing static NPM_TOKEN env var ([4db99e7](https://github.com/Nekzus/npm-sentinel-mcp/commit/4db99e79ad4296a255a547681d145f49dd9f8265))
* **ci:** configure npm registry-url and NODE_AUTH_TOKEN for semantic-release publish ([ece8745](https://github.com/Nekzus/npm-sentinel-mcp/commit/ece8745de2b6c4795b14b0a64b384f78cc9fb02d))

# [1.19.0-alpha.7](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.6...v1.19.0-alpha.7) (2026-07-19)


### Features

* **mcp:** migrate server to MCP SDK v2.0.0-beta.4 ([d1faaa1](https://github.com/Nekzus/npm-sentinel-mcp/commit/d1faaa1190cbbdee05e5f5a1f9cf076583395be9))

# [1.19.0-alpha.6](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.5...v1.19.0-alpha.6) (2026-07-13)


### Bug Fixes

* **docker:** configure dockerfile to use pnpm and fix build caching ([4bb1978](https://github.com/Nekzus/npm-sentinel-mcp/commit/4bb1978ac367878ddcbe7d4a4a813250e6cdc231))

# [1.19.0-alpha.5](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.4...v1.19.0-alpha.5) (2026-07-13)


### Features

* **smithery:** migrate mcp server to smithery v4 declarative stdio architecture ([db0d3f5](https://github.com/Nekzus/npm-sentinel-mcp/commit/db0d3f5e9bbf7e1f6bd2873630c5241d9fbc3532))

# [1.19.0-alpha.4](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.3...v1.19.0-alpha.4) (2026-07-13)


### Bug Fixes

* **smithery:** pin smithery dependencies to v3 to keep shttp build command functional ([8b52d15](https://github.com/Nekzus/npm-sentinel-mcp/commit/8b52d15f23a3d428bbd2085d145e78458d37218c))

# [1.19.0-alpha.3](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.2...v1.19.0-alpha.3) (2026-07-13)


### Features

* **alpha:** migrate GitHub API calls to deps.dev and integrate OpenSSF Scorecard ([44fe973](https://github.com/Nekzus/npm-sentinel-mcp/commit/44fe97345ec03d34a9266620a343e8f783f09edb))

# [1.19.0-alpha.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.19.0-alpha.1...v1.19.0-alpha.2) (2026-07-12)


### Bug Fixes

* **build:** asegurar compilacion de typescript en build script para entornos con --ignore-scripts ([8ec483c](https://github.com/Nekzus/npm-sentinel-mcp/commit/8ec483cf8a335e7fe01bc4abd6b5eba27da4505d))
* **smithery:** actualizar @smithery/cli a v3.19.0 para resolver error de keytar ([d4434b3](https://github.com/Nekzus/npm-sentinel-mcp/commit/d4434b34b235b1db24ad4059bf326cfc56a81aed))

# [1.19.0-alpha.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.18.1...v1.19.0-alpha.1) (2026-07-12)


### Bug Fixes

* **ci:** skip publish steps to MCP Registry if semantic-release does not release a new version ([599da59](https://github.com/Nekzus/npm-sentinel-mcp/commit/599da5992a9fb9590a4dc81f9b7956868bffa7df))
* **release:** remove --branches main from semantic-release script in package.json ([380a5a7](https://github.com/Nekzus/npm-sentinel-mcp/commit/380a5a7906d18021da77fef855994443954db8f4))


### Features

* **alpha:** implement local scoring engine, HTTP retry client, CDN readme fallback, and setup alpha release pipeline ([875b8f8](https://github.com/Nekzus/npm-sentinel-mcp/commit/875b8f88ccfa98110a9f2237d90f8a7701a6eac8))
