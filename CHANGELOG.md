## [1.5.5](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.5.4...v1.5.5) (2025-04-22)


### Bug Fixes

* add NODE_AUTH_TOKEN to publish workflow for improved NPM authentication during releases ([e857491](https://github.com/Nekzus/npm-sentinel-mcp/commit/e85749114e89c5c43f39eabb23a7f4dc5639776d))
* update README.md to enhance project description and improve badge formatting for the npm-mcp-server ([d8a1c66](https://github.com/Nekzus/npm-sentinel-mcp/commit/d8a1c667cfac5da7560588d8947af36c3ffb8b66))



## [1.5.4](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.5.3...v1.5.4) (2025-04-20)


### Bug Fixes

* enhance index.ts and llms documentation with detailed descriptions for NPM tools and Docker configuration ([c8387e7](https://github.com/Nekzus/npm-sentinel-mcp/commit/c8387e749e2c571cadb0f9e0961530dd1cc21203))



## [1.5.3](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.5.2...v1.5.3) (2025-04-18)


### Bug Fixes

* update @modelcontextprotocol/sdk dependency to version 1.10.1 in package.json and package-lock.json for improved functionality ([e853bb5](https://github.com/Nekzus/npm-sentinel-mcp/commit/e853bb589c325266b5d3c27db38c0eaa22ac0aa2))



## [1.5.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.5.1...v1.5.2) (2025-04-18)


### Bug Fixes

* update package.json and package-lock.json to upgrade @modelcontextprotocol/sdk to version 1.10.0; remove outdated express dependency and related types for cleaner dependency management ([6e6b3fd](https://github.com/Nekzus/npm-sentinel-mcp/commit/6e6b3fd958bc90a9f50a54a73b7d1e3bd0c3e324))



## [1.5.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.5.0...v1.5.1) (2025-04-18)


### Bug Fixes

* update package-lock.json to remove unnecessary biomejs CLI packages and clean up dependencies; modify README.md to enhance project description and features; update package.json to ensure proper formatting ([38f6dda](https://github.com/Nekzus/npm-sentinel-mcp/commit/38f6ddad0216dde7f580456a696ed36f0d505e64))



# [1.5.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.4.2...v1.5.0) (2025-04-18)


### Bug Fixes

* add maintainers support to NPM package schema in index.ts; enhance isNpmPackageInfo type guard for maintainers validation; improve error handling in handleNpmMaintainers function for better API response management; update README.md to reflect new features and installation instructions ([c45595a](https://github.com/Nekzus/npm-sentinel-mcp/commit/c45595ae8eafd7b1cecb7f718cb62a034810cd22))


### Features

* add new NPM tools for maintainers, score, README retrieval, and search functionality in index.ts; implement validation and error handling for API responses; enhance NpmsApiResponse interface and Zod schemas for improved data structure and type safety ([16acc12](https://github.com/Nekzus/npm-sentinel-mcp/commit/16acc123871dbd5dd39730cbc5e14d48300a2553))
* enhance NPM tools in index.ts by adding support for multiple package inputs across various functionalities; update parameter validation and error handling for improved robustness; implement changelog analysis and deprecation checks for better package management insights ([6358191](https://github.com/Nekzus/npm-sentinel-mcp/commit/63581915f737f98d75d0149fb99d9e100ad3dcdd))
* implement npmRepoStats tool in index.ts to analyze GitHub repository statistics; enhance error handling and validation for API responses; update license compatibility analysis for improved data structure and type safety ([a20e3e2](https://github.com/Nekzus/npm-sentinel-mcp/commit/a20e3e22118aa8b5b298cb2a92359f72519398a8))



## [1.4.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.4.1...v1.4.2) (2025-04-17)


### Bug Fixes

* remove Dockerfile as part of project refactoring; update package.json and package-lock.json to include express and its types for improved server functionality; enhance README.md with updated features and usage examples; modify tsconfig.json to include incremental builds and improve type checking ([b71ad52](https://github.com/Nekzus/npm-sentinel-mcp/commit/b71ad52ee767fdae1e5af03210ab0e0a49abc88a))



## [1.4.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.4.0...v1.4.1) (2025-04-17)


### Bug Fixes

* update index.ts to fetch full NPM package information instead of just the latest version; improve error handling for version data retrieval ([7cc364c](https://github.com/Nekzus/npm-sentinel-mcp/commit/7cc364c9df84a71475b5f7756ccc075dced77982))



# [1.4.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.3.1...v1.4.0) (2025-04-17)


### Bug Fixes

* update biome.json to ensure proper formatting; modify index.ts to fetch latest NPM package information and add uncaught error handling for improved stability ([96230bc](https://github.com/Nekzus/npm-sentinel-mcp/commit/96230bc90a6096d92097381e3a770484667cee94))


### Features

* implement McpServer for NPM tools in index.ts; add multiple tool handlers for npmVersions, npmLatest, npmDeps, npmTypes, npmSize, npmVulnerabilities, npmTrends, and npmCompare; establish stdin/stdout transport for server communication ([3176d73](https://github.com/Nekzus/npm-sentinel-mcp/commit/3176d73e4f7d9c668469845f638441350090ce14))



## [1.3.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.3.0...v1.3.1) (2025-04-17)


### Bug Fixes

* simplify author information in package.json; remove main and types fields for improved clarity in project structure ([457b91f](https://github.com/Nekzus/npm-sentinel-mcp/commit/457b91fbd2968b58a4b6ac96f20ea8546fbba068))



# [1.3.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.2.0...v1.3.0) (2025-04-17)


### Features

* remove QR code dependency from package.json and package-lock.json to streamline project dependencies; enhance clarity by eliminating unused type definitions ([a03d8db](https://github.com/Nekzus/npm-sentinel-mcp/commit/a03d8db315257fc30a1c3e977f1f25356da18a41))



# [1.2.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.8...v1.2.0) (2025-03-24)


### Features

* add Dockerfile for containerization and include QR code generation functionality in index.ts; update README.md with new tool details and usage examples; remove dotenv dependency for production clarity; enhance package.json and package-lock.json for updated dependencies and type definitions ([f0648b1](https://github.com/Nekzus/npm-sentinel-mcp/commit/f0648b126e13230b20bac5b2bd3c2d8c6489da23))



## [1.1.8](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.7...v1.1.8) (2025-03-24)


### Bug Fixes

* refactor index.ts to improve tool handling and error management; enhance type safety with updated type definitions; simplify card drawing logic and date/time formatting; implement basic structure for kitchen conversion tool; ensure consistent error messaging across tool handlers ([3878528](https://github.com/Nekzus/npm-sentinel-mcp/commit/3878528ddf359e084bad85116652bd940cab5f03))



## [1.1.7](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.6...v1.1.7) (2025-03-24)


### Bug Fixes

* enhance logging functionality in index.ts to filter critical error messages; improve error handling during server startup and message processing; implement graceful cleanup on signal interrupts for better resource management ([9df0eca](https://github.com/Nekzus/npm-sentinel-mcp/commit/9df0eca0d8fe987a76ad0685781a91ad0c9a96a5))



## [1.1.6](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.5...v1.1.6) (2025-03-24)


### Bug Fixes

* add dotenv as a dependency in package.json and package-lock.json to ensure environment variable management; remove unnecessary entries for better clarity and maintainability ([8a563f8](https://github.com/Nekzus/npm-sentinel-mcp/commit/8a563f835de0e53bb8c5f14ae44c1668db82726f))



## [1.1.5](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.4...v1.1.5) (2025-03-24)


### Bug Fixes

* remove dotenv from dependencies in package.json and add it back to devDependencies for better separation of production and development environments; ensure consistency in package-lock.json ([209de9b](https://github.com/Nekzus/npm-sentinel-mcp/commit/209de9b05889e5c9136fc74d1e36c21868a56d97))



## [1.1.4](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.3...v1.1.4) (2025-03-24)


### Bug Fixes

* refactor index.ts to enhance tool call handling with JSON-RPC 2.0 support; improve error handling for stdin messages and implement graceful shutdown on signal interrupts; update README.md with detailed examples for new tool usage and input/output formats ([61a9357](https://github.com/Nekzus/npm-sentinel-mcp/commit/61a935793246cd6ff46b4660050ed935ba6a02e9))



## [1.1.3](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.2...v1.1.3) (2025-03-24)


### Bug Fixes

* update server name and bin entry in configuration files to align with new naming convention; ensure consistency across index.ts, package.json, and package-lock.json ([07f56b1](https://github.com/Nekzus/npm-sentinel-mcp/commit/07f56b1267f2c29fcd73f7356c73fab5b2693431))



## [1.1.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.1...v1.1.2) (2025-03-24)


### Bug Fixes

* update server name and bin entry in configuration files to reflect new naming convention; ensure consistency across package.json and package-lock.json ([43e7ab4](https://github.com/Nekzus/npm-sentinel-mcp/commit/43e7ab437d2e1c3496d134c341eeec3ef67c6d1d))



## [1.1.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.1.0...v1.1.1) (2025-03-24)


### Bug Fixes

* update package.json to simplify file inclusion and adjust build script for better compatibility; modify tsconfig.json for module resolution and include all TypeScript files in the project ([b41080e](https://github.com/Nekzus/npm-sentinel-mcp/commit/b41080eaca0fae79b070767be8d6ceda7e11f9ef))



# [1.1.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.0.35...v1.1.0) (2025-03-23)


### Bug Fixes

* update package.json to correct bin entry path and bump @types/node version to 22.13.11; ensure jest version is explicitly set to 29.7.0 for consistency ([62b7e74](https://github.com/Nekzus/npm-sentinel-mcp/commit/62b7e748c08a4274f43f98c85e28c1477ce3e1c8))


### Features

* update package.json to correct bin entry path and bump @types/node version to 22.13.11; ensure jest version is explicitly set to 29.7.0 for consistency ([f28188c](https://github.com/Nekzus/npm-sentinel-mcp/commit/f28188c37b4d873fcf8e14ac3a1f71b861da92d4))


