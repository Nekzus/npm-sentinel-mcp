# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.11.4](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.3...v1.11.4) (2025-09-20)


### Bug Fixes

* improve version replacement logic in workflow with better error handling and validation ([85aad9b](https://github.com/Nekzus/npm-sentinel-mcp/commit/85aad9b9463bb3ed97022e082261a782caf85cf2))

## [1.11.3](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.2...v1.11.3) (2025-09-20)


### Bug Fixes

* use temp file method for index.ts template processing ([04d802a](https://github.com/Nekzus/npm-sentinel-mcp/commit/04d802a70316de8f1ae4d7a343e6f008b4bdbf44))

## [1.11.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.1...v1.11.2) (2025-09-20)


### Bug Fixes

* implement consistent version handling with templates ([3181d45](https://github.com/Nekzus/npm-sentinel-mcp/commit/3181d45af0a3dad186ae5379bce52fde702231d3))

## [1.11.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.0...v1.11.1) (2025-09-20)


### Bug Fixes

* sync hardcoded version in index.ts with package.json ([606654e](https://github.com/Nekzus/npm-sentinel-mcp/commit/606654e8c84821338f1624bc40d2bd56d9c05382))

# [1.11.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.10.1...v1.11.0) (2025-09-20)


### Bug Fixes

* test complete workflow with MCP Registry enabled ([99f9564](https://github.com/Nekzus/npm-sentinel-mcp/commit/99f956467d4a74111912b1aef0df43114f747446))


### Features

* re-enable MCP Registry publishing ([0560354](https://github.com/Nekzus/npm-sentinel-mcp/commit/0560354ba719e5b0fa32c79c8757f46c872daa02))

## [1.10.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.10.0...v1.10.1) (2025-09-20)


### Bug Fixes

* disable MCP Registry publishing temporarily ([69a0abf](https://github.com/Nekzus/npm-sentinel-mcp/commit/69a0abf172ed490a95b7f0e3bfe400d8c9a38e95))
* restore {{VERSION}} templates in server.json and index.ts ([173b33f](https://github.com/Nekzus/npm-sentinel-mcp/commit/173b33f366a995cfd175e663e630473c632d7f27))
* test deployment with corrected workflow ([904ae66](https://github.com/Nekzus/npm-sentinel-mcp/commit/904ae66fd51cffc6e1747e78e018a18b4cf1639b))

# [1.10.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.9.1...v1.10.0) (2025-09-20)


### Features

* add version bump test ([1f4c3d6](https://github.com/Nekzus/npm-sentinel-mcp/commit/1f4c3d6ef8543506cf97a6d0fa96bf21679e08f3))

## [1.9.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.9.0...v1.9.1) (2025-09-20)


### Bug Fixes

* reorder workflow to process templates before building ([7402840](https://github.com/Nekzus/npm-sentinel-mcp/commit/7402840640f2e53505375d2fd1dd744d02da34e5))
* use node: protocol for Node.js imports in process-templates.js ([f78aaf5](https://github.com/Nekzus/npm-sentinel-mcp/commit/f78aaf5ccb5f9970debc6cdc23387ebea6cb283d))

# [1.9.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.8.1...v1.9.0) (2025-09-20)


### Features

* implement automatic version synchronization with templates ([f81b436](https://github.com/Nekzus/npm-sentinel-mcp/commit/f81b436a412aa3a3fd34c05b3da6fb1d939fe170))

## [1.8.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.8.0...v1.8.1) (2025-08-26)


### Bug Fixes

* synchronize version numbers across all files ([0090aeb](https://github.com/Nekzus/npm-sentinel-mcp/commit/0090aeb4f108e4653b62b2fa0210ed05f027719b))

# [1.8.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.9...v1.8.0) (2025-08-26)


### Bug Fixes

* resolve Rollup optional dependencies issue in GitHub Actions ([05aa882](https://github.com/Nekzus/npm-sentinel-mcp/commit/05aa8828f444bb6b1ffeec0fed7586a6e75719c9))


### Features

* migrate to HTTP streamable transport with Smithery CLI ([9840217](https://github.com/Nekzus/npm-sentinel-mcp/commit/9840217edb46cb0955d02063f2f8731d9107e43a))

## [1.7.9](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.8...v1.7.9) (2025-06-29)


### Bug Fixes

* Updated Dockerfile ([31695b4](https://github.com/Nekzus/npm-sentinel-mcp/commit/31695b4b023c14bcf28b0199d3e59be95e7ebaae))

## [1.7.8](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.7...v1.7.8) (2025-06-04)


### Bug Fixes

* bump version to 1.7.8 ([096ba89](https://github.com/Nekzus/npm-sentinel-mcp/commit/096ba89502d5df98ddb3d53a605416ec508621e0))

## [1.7.7](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.6...v1.7.7) (2025-06-04)


### Bug Fixes

* Updates ([850e492](https://github.com/Nekzus/npm-sentinel-mcp/commit/850e492dca3203300560a05425619000982f1fe2))

## [1.7.6](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.5...v1.7.6) (2025-05-17)


### Bug Fixes

* Updates ([78e67b4](https://github.com/Nekzus/npm-sentinel-mcp/commit/78e67b4d9bb611ec31afa4e4e580d8716314e20a))

## [1.7.5](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.4...v1.7.5) (2025-05-16)


### Bug Fixes

* update README.md to remove unnecessary badge ([256b474](https://github.com/Nekzus/npm-sentinel-mcp/commit/256b474bbb3808f1fb24f2d8ef5d878d30f3f3ba))

## [1.7.4](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.3...v1.7.4) (2025-05-14)


### Bug Fixes

*  Removed the `getServerStatus` tool ([0399ed1](https://github.com/Nekzus/npm-sentinel-mcp/commit/0399ed1bfc64384212fc48cfedcc8124dc68c37a))

## [1.7.3](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.2...v1.7.3) (2025-05-13)


### Bug Fixes

* 1.7.3 [skip ci] ([3b67c46](https://github.com/Nekzus/npm-sentinel-mcp/commit/3b67c4692a84704cdaf50b5e466f65f133666860))
* update README.md to include server resources ([f71e01b](https://github.com/Nekzus/npm-sentinel-mcp/commit/f71e01bab64e8dd35d8d75365650b65f7271665a))

## [1.7.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.1...v1.7.2) (2025-05-13)


### Bug Fixes

* enhance tool definitions in index.ts ([01750a6](https://github.com/Nekzus/npm-sentinel-mcp/commit/01750a6db34a4df3f3cc88beebf05d494cedfb63))

## [1.7.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.7.0...v1.7.1) (2025-05-13)


### Bug Fixes

* bump version to 1.6.1 ([5851952](https://github.com/Nekzus/npm-sentinel-mcp/commit/5851952da0dae85cbbe7563ec6f36779f400c8fa))
* update version to 1.7.1 and adjust file paths ([6c003ee](https://github.com/Nekzus/npm-sentinel-mcp/commit/6c003eece4ec4820d246c437d6649a5b938bff2f))

# [1.7.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.6.1...v1.7.0) (2025-05-11)


### Features

* add resource registration for server documentation ([f69535f](https://github.com/Nekzus/npm-sentinel-mcp/commit/f69535f3fbf5a951c83261e652f16649cd4f6391))
* bump version to 1.7.0 ([584ae29](https://github.com/Nekzus/npm-sentinel-mcp/commit/584ae29e5ca2cd99abe0d32dc827f77875e69d91))

## [1.6.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.6.0...v1.6.1) (2025-05-11)


### Bug Fixes

* improve code readability and consistency in index.ts ([d8eb2b8](https://github.com/Nekzus/npm-sentinel-mcp/commit/d8eb2b8c6f5de85e6a27ffbd4d897aad50d2774e))

# [1.6.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.5.6...v1.6.0) (2025-05-11)


### Bug Fixes

* improve debug messages in isValidNpmsResponse function ([fc75624](https://github.com/Nekzus/npm-sentinel-mcp/commit/fc7562413e790597a5da3c5b7b5a5b5db05c0ffd))


### Features

* add caching support for npm version retrieval ([c9e51bb](https://github.com/Nekzus/npm-sentinel-mcp/commit/c9e51bb5f4dacfbdfb5e88c11ac86846532dbdc1))
* enhance caching logic in handleNpmAlternatives function ([489a99b](https://github.com/Nekzus/npm-sentinel-mcp/commit/489a99b7a0e39e9109e8fd236dd6f25ad507ab85))
* enhance caching logic in handleNpmChangelogAnalysis function ([41e91e6](https://github.com/Nekzus/npm-sentinel-mcp/commit/41e91e6cab9203d2bf7a4c57e6d06daf9525986f))
* enhance caching logic in handleNpmCompare function ([2a0435f](https://github.com/Nekzus/npm-sentinel-mcp/commit/2a0435fdfbc401f5f6e07a9dc5678b3b576ccda8))
* enhance caching logic in handleNpmDeprecated function ([2a46038](https://github.com/Nekzus/npm-sentinel-mcp/commit/2a46038ebfb229b45cf5c6dd5025d350c1da3667))
* enhance caching logic in handleNpmDeps function ([492b266](https://github.com/Nekzus/npm-sentinel-mcp/commit/492b266ca5159cf29075c4d7d77ace9d0ebd8822))
* enhance caching logic in handleNpmLicenseCompatibility function ([7ef0b99](https://github.com/Nekzus/npm-sentinel-mcp/commit/7ef0b99feda96bbff4d52547dc2aa690f2515da4))
* enhance caching logic in handleNpmMaintainers function ([0c83709](https://github.com/Nekzus/npm-sentinel-mcp/commit/0c837091218d8318557f8cf448f08f234fe33ceb))
* enhance caching logic in handleNpmMaintenance function ([f9a53d1](https://github.com/Nekzus/npm-sentinel-mcp/commit/f9a53d162596060b9e7e0bbe0033855bc900651e))
* enhance caching logic in handleNpmPackageReadme function ([93ad407](https://github.com/Nekzus/npm-sentinel-mcp/commit/93ad407153aba48c092eeab7f70b0f053e7f8bea))
* enhance caching logic in handleNpmQuality and handleNpmMaintenance functions ([2317189](https://github.com/Nekzus/npm-sentinel-mcp/commit/2317189b4f5bfcac62f198f2965a64cba950db0a))
* enhance caching logic in handleNpmQuality function ([b6f9fe9](https://github.com/Nekzus/npm-sentinel-mcp/commit/b6f9fe973f49494b39a881e8a8fff950f17dd764))
* enhance caching logic in handleNpmRepoStats function ([0cf4dcf](https://github.com/Nekzus/npm-sentinel-mcp/commit/0cf4dcf1541ebb2ef342dc6ff8fd31b59ec76c6d))
* enhance caching logic in handleNpmScore function ([17e56bc](https://github.com/Nekzus/npm-sentinel-mcp/commit/17e56bcd829402bae6ba7fc3b460329e3b057ef8))
* enhance caching logic in handleNpmSearch function ([8245fcf](https://github.com/Nekzus/npm-sentinel-mcp/commit/8245fcf077243d187f2f5da0023b2efc1cee1394))
* enhance caching logic in handleNpmSize function ([7af7871](https://github.com/Nekzus/npm-sentinel-mcp/commit/7af78716ae7380f308075b503634c5598a8f2171))
* enhance caching logic in handleNpmTypes function ([9ce4f53](https://github.com/Nekzus/npm-sentinel-mcp/commit/9ce4f53996460208131bed1ae6548e96eebacb68))
* enhance caching logic in handleNpmVulnerabilities function ([1c30d56](https://github.com/Nekzus/npm-sentinel-mcp/commit/1c30d5697a4109d517597cbd030109d1de7888ef))
* implement caching mechanism for npm version retrieval ([29f9808](https://github.com/Nekzus/npm-sentinel-mcp/commit/29f9808eddee30416db6681e9a85cebabc677645))
* improve error handling and response formatting in handleNpm functions ([5b10ccd](https://github.com/Nekzus/npm-sentinel-mcp/commit/5b10ccdfda0a4853ee52040c96efcfec8c9a1675))
* update README to reflect new features and API response format ([077ab2a](https://github.com/Nekzus/npm-sentinel-mcp/commit/077ab2acf104c41b30ee0222fe7148f4bb62d165))

## [1.5.6](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.5.5...v1.5.6) (2025-04-24)


### Bug Fixes

* add semantic-release configuration and CHANGELOG file for automated versioning and release notes generation ([2c35197](https://github.com/Nekzus/npm-sentinel-mcp/commit/2c35197d6f4aa3007bdcb89f1bf032f282a94963))

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
