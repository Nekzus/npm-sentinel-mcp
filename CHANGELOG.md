# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.12.33](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.32...v1.12.33) (2025-12-24)


### Bug Fixes

* **registry:** update server.json identifier to match renamed npm package @nekzus/mcp-server ([5de23e9](https://github.com/Nekzus/npm-sentinel-mcp/commit/5de23e943290a84d955d10dfbbedd0ba32432931))

## [1.12.32](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.31...v1.12.32) (2025-12-24)


### Bug Fixes

* **ci:** restore NPM_TOKEN auth for publishing, requiring Automation token to bypass 2FA ([142bb4c](https://github.com/Nekzus/npm-sentinel-mcp/commit/142bb4c13b8d0fba56e8a1449da7da9d8c3ead2e))

## [1.12.31](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.30...v1.12.31) (2025-12-24)


### Bug Fixes

* **ci:** configure tokenless OIDC publishing by removing setup-node registry setup ([1017ce6](https://github.com/Nekzus/npm-sentinel-mcp/commit/1017ce6325c8f8be183d7157c87cb98a9e329c2a))

## [1.12.30](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.29...v1.12.30) (2025-12-24)


### Bug Fixes

* **ci:** switch to OIDC for npm publishing to bypass 2FA restrictions on automation tokens ([17bbe48](https://github.com/Nekzus/npm-sentinel-mcp/commit/17bbe48eac1ae45a8d58047448fb5b31a6b18f75))
* **config:** revert version to 1.11.8 and mcpName to io.github.Nekzus/npm-sentinel-mcp as requested ([a63038b](https://github.com/Nekzus/npm-sentinel-mcp/commit/a63038b134adcf3a695d7739efa872edd8fd3089))

## [1.12.29](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.28...v1.12.29) (2025-12-24)


### Bug Fixes

* **config:** rename package to @nekzus/mcp-server and update mcp identifier ([9ef2c7f](https://github.com/Nekzus/npm-sentinel-mcp/commit/9ef2c7f13cef870ca135631fba72b2db79f73e70))

## [1.12.28](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.27...v1.12.28) (2025-12-24)


### Bug Fixes

* **deploy:** skip prepare script during npm install to avoid missing source error, but rebuild native modules ([e1aacb8](https://github.com/Nekzus/npm-sentinel-mcp/commit/e1aacb8561c62b29d8c8f91679dfe49277c3b333))

## [1.12.27](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.26...v1.12.27) (2025-12-24)


### Bug Fixes

* **deploy:** fix Alpine Dockerfile - install build tools and allow scripts for keytar compilation ([590b3df](https://github.com/Nekzus/npm-sentinel-mcp/commit/590b3dfede9cc58764c16ab6a82de4ca63f4fe16))

## [1.12.26](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.25...v1.12.26) (2025-12-24)


### Bug Fixes

* **deploy:** update Dockerfile with smithery-generated multi-stage alpine build ([78a2569](https://github.com/Nekzus/npm-sentinel-mcp/commit/78a256920b98cb83062c91256e3e7d71bd3aab3b))

## [1.12.25](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.24...v1.12.25) (2025-12-24)


### Bug Fixes

* **deploy:** enable native module compilation in Dockerfile (install build-essential, remove ignore-scripts) ([2d3cb0b](https://github.com/Nekzus/npm-sentinel-mcp/commit/2d3cb0b8aae6e9e3b7efe4a1d418c376cd179457))

## [1.12.24](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.23...v1.12.24) (2025-12-24)


### Bug Fixes

* **deploy:** update smithery.yaml startCommand type to "http" for cloud deployment ([de77c70](https://github.com/Nekzus/npm-sentinel-mcp/commit/de77c7008677b8309cec78b363a9bcf91d9a07c0))

## [1.12.23](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.22...v1.12.23) (2025-12-24)


### Bug Fixes

* **deploy:** switch smithery.yaml to container runtime to force usage of custom Dockerfile ([3e2c689](https://github.com/Nekzus/npm-sentinel-mcp/commit/3e2c6895f1c50ed5ea4a9beeee7f2a8d784a9fe2))

## [1.12.22](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.21...v1.12.22) (2025-12-24)


### Bug Fixes

* **deploy:** use custom Dockerfile to install libsecret-1-0 and bypass smithery auto-build limitations ([93acecd](https://github.com/Nekzus/npm-sentinel-mcp/commit/93acecd3be7ca96d18962eb6f1ececec1a77f040))
* manual trigger for final deployment verification ([19c9b71](https://github.com/Nekzus/npm-sentinel-mcp/commit/19c9b7157fb4fdc1d8c79a3214548c0c34da62cd))

## [1.12.21](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.20...v1.12.21) (2025-12-24)


### Bug Fixes

* **config:** update server.json schema to 2025-12-11 to support registryType property ([6b7e1d6](https://github.com/Nekzus/npm-sentinel-mcp/commit/6b7e1d6f8e07136aa3c6f5fb1cf8a13ea56a548c))

## [1.12.20](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.19...v1.12.20) (2025-12-24)


### Bug Fixes

* **ci:** correct mcp-publisher v1.4.0 download url format (remove version from filename) ([8360dee](https://github.com/Nekzus/npm-sentinel-mcp/commit/8360deeab069406c0cb6866aa5abb39865dab436))

## [1.12.19](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.18...v1.12.19) (2025-12-24)


### Bug Fixes

* **ci:** restore missing step name in publish.yml to fix YAML syntax error ([7155ab1](https://github.com/Nekzus/npm-sentinel-mcp/commit/7155ab1bff8524e387e82ff456a4ef732792d26c))
* **ci:** upgrade mcp-publisher to v1.4.0 to resolve registryType serialization bug ([5b01fc0](https://github.com/Nekzus/npm-sentinel-mcp/commit/5b01fc07226e35dcd8b4f27e697ac31de0f003a6))

## [1.12.18](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.17...v1.12.18) (2025-12-24)


### Bug Fixes

* **deploy:** configure custom buildCommand in smithery.yaml to match established pipeline ([6d1a975](https://github.com/Nekzus/npm-sentinel-mcp/commit/6d1a97593f92e6e9c801cf1da773a8bb47554c32))

## [1.12.17](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.16...v1.12.17) (2025-12-24)


### Bug Fixes

* manual trigger for deployment verification ([becad23](https://github.com/Nekzus/npm-sentinel-mcp/commit/becad2335188a0e4cb499be1b09346514833ac82))

## [1.12.16](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.15...v1.12.16) (2025-12-24)


### Bug Fixes

* **registry:** revert to registryType to match live API requirements ([ec8ca1c](https://github.com/Nekzus/npm-sentinel-mcp/commit/ec8ca1c6cf516755816d649d7c9790542c24915b))

## [1.12.15](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.14...v1.12.15) (2025-12-24)


### Bug Fixes

* **registry:** use registry_type in server.json and enable mcp publishing ([a818310](https://github.com/Nekzus/npm-sentinel-mcp/commit/a81831055a60a32a680ee52d04765f7edb807e7c))

## [1.12.14](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.13...v1.12.14) (2025-12-24)


### Bug Fixes

* **ci:** prevent deletion of smithery dependencies before build step ([30542f2](https://github.com/Nekzus/npm-sentinel-mcp/commit/30542f2c88976e8e8ef1786353ae168b6976d338))

## [1.12.13](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.12...v1.12.13) (2025-12-24)


### Bug Fixes

* **build:** invoke smithery cli via node with direct path to bypass symlink issues ([10af258](https://github.com/Nekzus/npm-sentinel-mcp/commit/10af25810088151841a8a0c123a2cedf0c300c4b))

## [1.12.12](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.11...v1.12.12) (2025-12-24)


### Bug Fixes

* **build:** use explicit path for smithery binary to resolve CI PATH issues ([ab940ea](https://github.com/Nekzus/npm-sentinel-mcp/commit/ab940eaa48bb8ffab70cd9882218d01aaa3564fa))

## [1.12.11](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.10...v1.12.11) (2025-12-24)


### Bug Fixes

* **build:** use local smithery binary to ensure dependency resolution ([3d387a6](https://github.com/Nekzus/npm-sentinel-mcp/commit/3d387a6f92edc38bc0bb3a3db3be6ba8c675c7e4))

## [1.12.10](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.9...v1.12.10) (2025-12-24)


### Bug Fixes

* **build:** update @smithery/cli to ^2.0.0 to match npx runtime and fix resolution ([8aa44e3](https://github.com/Nekzus/npm-sentinel-mcp/commit/8aa44e3b984436c0a761e4cad81ff63c5219d8ef))

## [1.12.9](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.8...v1.12.9) (2025-12-24)


### Bug Fixes

* **build:** add missing @smithery/sdk dependency for build:http ([08452b1](https://github.com/Nekzus/npm-sentinel-mcp/commit/08452b1d64ff88153937b65baaf759a80ee7d536))

## [1.12.8](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.7...v1.12.8) (2025-12-24)


### Bug Fixes

* **ci:** install libsecret-1-0 for smithery/cli build ([1f49553](https://github.com/Nekzus/npm-sentinel-mcp/commit/1f49553e7dd7044111ce47e527580ca1ecc5f257))

## [1.12.7](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.6...v1.12.7) (2025-12-24)


### Bug Fixes

* **ci:** disable MCP Registry publish due to CLI v1.0.0 schema bug ([fb29da6](https://github.com/Nekzus/npm-sentinel-mcp/commit/fb29da6c6e7fe4144372a300a8df8b407b6b7877))

## [1.12.6](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.5...v1.12.6) (2025-12-24)


### Bug Fixes

* **registry:** correct server.json schema to match API requirements ([d5ac3c2](https://github.com/Nekzus/npm-sentinel-mcp/commit/d5ac3c2a9e0b250d408c7e52ac4f521e61f33da1))

## [1.12.5](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.4...v1.12.5) (2025-12-24)


### Bug Fixes

* **ci:** use NPM_TOKEN for initial package bootstrap ([a4dcc69](https://github.com/Nekzus/npm-sentinel-mcp/commit/a4dcc6911bccb657546938aa50f5ef6832d57c38))

## [1.12.4](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.3...v1.12.4) (2025-12-24)


### Bug Fixes

* rename package to @nekzus/npm-sentinel-mcp to match repo and OIDC config ([54a2122](https://github.com/Nekzus/npm-sentinel-mcp/commit/54a2122e7450e3f1118624ac161b4265ee9166df))

## [1.12.3](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.2...v1.12.3) (2025-12-24)


### Bug Fixes

* **ci:** add scope to setup-node to ensure correct .npmrc for [@nekzus](https://github.com/nekzus) ([08785fc](https://github.com/Nekzus/npm-sentinel-mcp/commit/08785fc59bc0d2107b89286befa0cbb91314bf30))

## [1.12.2](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.1...v1.12.2) (2025-12-24)


### Bug Fixes

* **ci:** restore .npmrc and add dummy token to enable OIDC override ([f1e7ed9](https://github.com/Nekzus/npm-sentinel-mcp/commit/f1e7ed97f83143bbd6e1f685075cea9445a37144))

## [1.12.1](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.12.0...v1.12.1) (2025-12-24)


### Bug Fixes

* **ci:** remove .npmrc before manual publish to ensure OIDC auth ([e31d6a0](https://github.com/Nekzus/npm-sentinel-mcp/commit/e31d6a0269f90a954fd97752ef55722d23b2ae65))

# [1.12.0](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.8...v1.12.0) (2025-12-24)


### Bug Fixes

* **ci:** disable semantic-release npm publish and use manual OIDC publish ([531bda6](https://github.com/Nekzus/npm-sentinel-mcp/commit/531bda60fcd7f0a1e9ce2b746ea559b81ebca683))
* **ci:** regenerate package-lock.json with legacy-peer-deps validation ([46754c0](https://github.com/Nekzus/npm-sentinel-mcp/commit/46754c0804c76c7dbaf177e5f4bfc6650025df8f))
* **ci:** remove NPM_TOKEN env var to enable OIDC auth for semantic-release ([8c6d365](https://github.com/Nekzus/npm-sentinel-mcp/commit/8c6d3656b777f3168c82106d211a8a89aaf42241))
* **ci:** remove registry-url from setup-node to prevent auth conflicts ([294777e](https://github.com/Nekzus/npm-sentinel-mcp/commit/294777e8e001b0526c262e8ff3e54c7b8e0c13ea))
* **ci:** sync package-lock.json with version bump ([95ec6a3](https://github.com/Nekzus/npm-sentinel-mcp/commit/95ec6a30e10b0a3427f077149acd730eca5e4be5))
* **deps:** add overrides for zod to resolve peer dependency conflicts in CI ([23f1e3c](https://github.com/Nekzus/npm-sentinel-mcp/commit/23f1e3cff1c15b2203b41d6fd5bc304d533b60a3))
* resolve deprecation warnings, standardise registerTool, fix TS errors in tests, bump to 1.12.0 ([c910120](https://github.com/Nekzus/npm-sentinel-mcp/commit/c9101206c46f8c6f70ec70be0f121c353115ec5a))
* **test:** remove useless else block in npm-metrics.test.ts ([77cb102](https://github.com/Nekzus/npm-sentinel-mcp/commit/77cb102398594767767f2b52ee303594e0a725a2))
* **tests:** downgrade zod-to-json-schema and update security mocks/assertions ([6f73522](https://github.com/Nekzus/npm-sentinel-mcp/commit/6f7352219d66cff48fe22958e234aa9b9617d3b4))
* update .gitignore to include memory.json and MCP Registry files; remove obsolete test files ([102fc69](https://github.com/Nekzus/npm-sentinel-mcp/commit/102fc69697164e90c3d492f461896d52c3732890))


### Features

* **npm-sentinel:** modernize vulnerability scanner with batch queries and dependency support ([2be32ce](https://github.com/Nekzus/npm-sentinel-mcp/commit/2be32cedfc05bcfce034e009dc27ce6697d34966))

## [1.11.8](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.7...v1.11.8) (2025-09-20)


### Bug Fixes

* update hardcoded version in index.ts to 1.11.8 ([c5f185e](https://github.com/Nekzus/npm-sentinel-mcp/commit/c5f185e17ecfa50ce5139a2f4bebda8f39570a41))

## [1.11.7](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.6...v1.11.7) (2025-09-20)


### Bug Fixes

* restore {{VERSION}} placeholders in server.json and simplify workflow like example ([22fbd89](https://github.com/Nekzus/npm-sentinel-mcp/commit/22fbd89f183ffd991033a4a176ee22e3ef51e6d3))

## [1.11.6](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.5...v1.11.6) (2025-09-20)


### Bug Fixes

* hardcode version in index.ts and simplify workflow to only update server.json ([e635c91](https://github.com/Nekzus/npm-sentinel-mcp/commit/e635c915127d2bb8bbe16f8fcb95c1c28828259e))

## [1.11.5](https://github.com/Nekzus/npm-sentinel-mcp/compare/v1.11.4...v1.11.5) (2025-09-20)


### Bug Fixes

* add commit step to persist version updates in workflow ([22d5c41](https://github.com/Nekzus/npm-sentinel-mcp/commit/22d5c414ca36c2d7b17a1b8d7ebfa4f841d63025))

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
