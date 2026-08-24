import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

/**
 * End-to-End Test Suite: Dual-Era MCP Protocol & Production Package Consumer
 *
 * Simulates a 100% realistic scenario:
 * 1. Builds the project (dist/)
 * 2. Packages it into a production tarball via `npm pack`
 * 3. Creates an isolated consumer project and installs the tarball
 * 4. Tests STDIO Transport (npx/CLI binary) with MCP v2 Client
 * 5. Tests HTTP Transport with Legacy (v1 2025-11-25) & Modern (v2 2026-07-28) JSON-RPC requests
 * 6. Verifies schema polymorphism (e.g. string bugs in tailwindcss) and abbreviated packument
 */

describe.sequential('Dual-Era MCP Protocol & Packaged Consumer E2E', () => {
	const rootDir = process.cwd();
	const pkgInfo = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
	const tarballName = `nekzus-mcp-server-${pkgInfo.version}.tgz`;
	const tarballPath = path.join(rootDir, tarballName);
	const consumerDir = path.join(rootDir, '.e2e-dual-era-test');

	beforeAll(async () => {
		// 1. Build and pack the local package
		child_process.execSync('pnpm run build', { cwd: rootDir, stdio: 'pipe' });
		child_process.execSync('npm pack', { cwd: rootDir, stdio: 'pipe' });

		if (!fs.existsSync(tarballPath)) {
			throw new Error(`Tarball ${tarballName} was not generated at ${tarballPath}`);
		}

		// 2. Set up isolated consumer project
		if (fs.existsSync(consumerDir)) {
			fs.rmSync(consumerDir, { recursive: true, force: true });
		}
		fs.mkdirSync(consumerDir, { recursive: true });

		fs.writeFileSync(
			path.join(consumerDir, 'package.json'),
			JSON.stringify(
				{
					name: 'e2e-dual-era-consumer',
					version: '1.0.0',
					type: 'module',
				},
				null,
				2,
			),
		);

		// Install the packed tarball into the consumer project
		child_process.execSync(`npm install --no-save "${tarballPath}"`, {
			cwd: consumerDir,
			stdio: 'pipe',
		});
	}, 120_000);

	afterAll(async () => {
		// Clean up consumer test directory and tarball
		if (fs.existsSync(consumerDir)) {
			fs.rmSync(consumerDir, { recursive: true, force: true });
		}
		if (fs.existsSync(tarballPath)) {
			fs.rmSync(tarballPath, { force: true });
		}
	});

	// =========================================================================
	// 1. STDIO Transport (npx / CLI binary execution)
	// =========================================================================
	describe('STDIO Transport & Binary Verification (MCP v2 Client)', () => {
		let client: Client;
		let transport: StdioClientTransport;

		beforeAll(async () => {
			const installedBin = path.join(
				consumerDir,
				'node_modules',
				'@nekzus',
				'mcp-server',
				'dist',
				'index.js',
			);

			transport = new StdioClientTransport({
				command: 'node',
				args: [installedBin],
			});

			client = new Client({ name: 'e2e-stdio-client', version: '2.0.0' }, { capabilities: {} });

			await client.connect(transport);
		}, 30_000);

		afterAll(async () => {
			if (transport) {
				await transport.close();
			}
		});

		test('handshake succeeds and returns server metadata', () => {
			const info = client.getServerVersion();
			expect(info).toBeDefined();
			expect(info?.name).toBe('npm-sentinel-mcp');
			expect(info?.version).toBe(pkgInfo.version);
		});

		test('server lists all 19 tools with schema annotations & icons', async () => {
			const { tools } = await client.listTools();
			expect(tools).toHaveLength(19);

			const toolNames = tools.map((t) => t.name);
			expect(toolNames).toContain('npmLatest');
			expect(toolNames).toContain('npmVersions');
			expect(toolNames).toContain('npmDeps');
			expect(toolNames).toContain('npmTypes');

			for (const tool of tools) {
				expect(tool.inputSchema).toBeDefined();
				expect(tool.outputSchema).toBeDefined();
				expect(tool.annotations).toBeDefined();
				expect(tool.annotations?.title).toBeDefined();
				expect(tool.icons).toBeDefined();
				expect(tool.icons?.length).toBeGreaterThan(0);
			}
		});

		test('server lists resources and allows reading readme resource', async () => {
			const { resources } = await client.listResources();
			expect(resources.length).toBe(2);

			const readmeResource = resources.find((r) => r.name === 'serverReadme');
			expect(readmeResource).toBeDefined();

			const readResult = await client.readResource({ uri: 'doc://server/readme' });
			expect(readResult.contents).toHaveLength(1);
			expect(readResult.contents[0].mimeType).toBe('text/markdown');
		});

		test('server lists prompts and allows retrieving analyze-package prompt', async () => {
			const { prompts } = await client.listPrompts();
			expect(prompts.length).toBe(1);
			expect(prompts[0].name).toBe('analyze-package');

			const promptResult = await client.getPrompt({
				name: 'analyze-package',
				arguments: { package: 'express' },
			});
			expect(promptResult.messages).toHaveLength(1);
			expect(promptResult.messages[0].role).toBe('user');
		});

		test('Forense 1: npmLatest con el stack original (tailwindcss, @tailwindcss/postcss, lucide-react, drizzle-orm, vitest, next)', async () => {
			const targetPackages = [
				'tailwindcss',
				'@tailwindcss/postcss',
				'lucide-react',
				'drizzle-orm',
				'vitest',
				'next',
			];

			const result = await client.callTool({
				name: 'npmLatest',
				arguments: { packages: targetPackages },
			});

			expect(result.content).toBeDefined();
			expect(result.structuredContent).toBeDefined();

			const structured = result.structuredContent as {
				results?: Array<{
					packageName: string;
					status: string;
					error: string | null;
					data: {
						name: string;
						version: string;
						bugsUrl?: string | null;
						repositoryUrl?: string | null;
						types?: string | null;
					} | null;
				}>;
			};

			expect(structured.results).toHaveLength(targetPackages.length);

			for (const pkgName of targetPackages) {
				const item = structured.results?.find((r) => r.packageName === pkgName);
				expect(item, `Package ${pkgName} should exist in results`).toBeDefined();
				expect(item?.status, `Package ${pkgName} should succeed`).toBe('success');
				expect(item?.error, `Package ${pkgName} error should be null`).toBeNull();
				expect(item?.data, `Package ${pkgName} should have data`).toBeDefined();
			}

			// Verificaciones específicas de campos que antes fallaban
			const tailwind = structured.results?.find((r) => r.packageName === 'tailwindcss');
			expect(tailwind?.data?.bugsUrl).toBe('https://github.com/tailwindlabs/tailwindcss/issues');

			const tailwindPostcss = structured.results?.find(
				(r) => r.packageName === '@tailwindcss/postcss',
			);
			expect(tailwindPostcss?.data?.bugsUrl).toBe(
				'https://github.com/tailwindlabs/tailwindcss/issues',
			);

			const lucide = structured.results?.find((r) => r.packageName === 'lucide-react');
			expect(lucide?.data?.repositoryUrl).toContain('github.com/lucide-icons/lucide');
			expect(lucide?.data?.types).toBeDefined();

			const drizzle = structured.results?.find((r) => r.packageName === 'drizzle-orm');
			expect(drizzle?.data?.types).toBeDefined();
		}, 60_000);

		test('Forense 2: npmVersions con lote de 25 paquetes Tier-1 simultáneos (Abbreviated Packument & Buffer Check)', async () => {
			const batch25 = [
				'react',
				'react-dom',
				'next',
				'tailwindcss',
				'@tailwindcss/postcss',
				'lucide-react',
				'drizzle-orm',
				'vitest',
				'zod',
				'typescript',
				'express',
				'hono',
				'clsx',
				'tailwind-merge',
				'postcss',
				'esbuild',
				'dotenv',
				'axios',
				'rxjs',
				'lodash',
				'chalk',
				'commander',
				'glob',
				'ws',
				'debug',
			];

			const result = await client.callTool({
				name: 'npmVersions',
				arguments: { packages: batch25 },
			});

			expect(result.content).toBeDefined();
			expect(result.structuredContent).toBeDefined();

			const structured = result.structuredContent as {
				results?: Array<{
					packageName: string;
					status: string;
					error: string | null;
					data: {
						allVersions: string[];
						tags: Record<string, string>;
						latestVersionTag: string;
					} | null;
				}>;
			};

			expect(structured.results).toHaveLength(25);

			// Todos los 25 paquetes deben resolver sin error
			for (const pkgName of batch25) {
				const item = structured.results?.find((r) => r.packageName === pkgName);
				expect(item, `Package ${pkgName} in batch`).toBeDefined();
				expect(item?.status).toBe('success');
				expect(item?.error).toBeNull();
				expect(item?.data?.allVersions.length).toBeGreaterThan(0);
				expect(item?.data?.tags?.latest).toBeDefined();
			}
		}, 90_000);

		test('Forense 3: npmDeps con paquetes del stack original', async () => {
			const result = await client.callTool({
				name: 'npmDeps',
				arguments: {
					packages: ['tailwindcss', '@tailwindcss/postcss', 'lucide-react', 'drizzle-orm'],
				},
			});

			expect(result.content).toBeDefined();
			expect(result.structuredContent).toBeDefined();

			const structured = result.structuredContent as {
				results?: Array<{
					packageName: string;
					status: string;
					error: string | null;
					data: unknown;
				}>;
			};

			expect(structured.results).toHaveLength(4);
			for (const item of structured.results || []) {
				expect(item.status).toBe('success');
				expect(item.error).toBeNull();
				expect(item.data).toBeDefined();
			}
		}, 45_000);

		test('Forense 4: npmTypes con resolución de subpath exports maps (lucide-react, drizzle-orm, tailwindcss)', async () => {
			const result = await client.callTool({
				name: 'npmTypes',
				arguments: { packages: ['lucide-react', 'drizzle-orm', 'tailwindcss'] },
			});

			expect(result.content).toBeDefined();
			expect(result.structuredContent).toBeDefined();

			const structured = result.structuredContent as {
				results?: Array<{
					package: string;
					status: string;
					error: string | null;
					data: {
						mainPackage: {
							name: string;
							version: string;
							hasBuiltInTypes: boolean;
							typesPath: string | null;
						};
						typesPackage: {
							name: string;
							version: string | null;
							isAvailable: boolean;
						};
					} | null;
				}>;
			};

			expect(structured.results).toHaveLength(3);
			for (const item of structured.results || []) {
				expect(item.status).toBe('success');
				expect(item.error).toBeNull();
				expect(item.data?.mainPackage?.hasBuiltInTypes).toBe(true);
				expect(item.data?.mainPackage?.typesPath).toBeDefined();
			}

			const lucide = structured.results?.find((r) => r.package.startsWith('lucide-react'));
			expect(lucide?.data?.mainPackage?.typesPath).toBe('dist/lucide-react.d.ts');
		}, 45_000);
	});

	// =========================================================================
	// 2. HTTP Transport: Dual-Era Legacy (MCP v1 2025-11-25) & Modern (MCP v2 2026-07-28)
	// =========================================================================
	describe('HTTP Transport Dual-Era Verification', () => {
		let createMcpHttpHandler: (options?: {
			npmRegistryUrl?: string;
			legacy?: 'stateless' | 'reject';
		}) => (req: Request) => Promise<Response>;

		const mcpHeaders = {
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
		};

		async function parseMcpResponse(response: Response): Promise<any> {
			const text = await response.text();
			const contentType = response.headers.get('content-type') || '';
			if (
				contentType.includes('text/event-stream') ||
				text.startsWith('event:') ||
				text.startsWith('data:')
			) {
				const lines = text.split('\n');
				for (const line of lines) {
					if (line.startsWith('data:')) {
						const dataJson = line.slice(5).trim();
						if (dataJson) {
							return JSON.parse(dataJson);
						}
					}
				}
			}
			return JSON.parse(text);
		}

		beforeAll(async () => {
			const httpModulePath = path.join(
				consumerDir,
				'node_modules',
				'@nekzus',
				'mcp-server',
				'dist',
				'src',
				'http.js',
			);

			const imported = await import(`file://${httpModulePath.replace(/\\/g, '/')}`);
			createMcpHttpHandler = imported.createMcpHttpHandler;
			expect(typeof createMcpHttpHandler).toBe('function');
		});

		test('HTTP Legacy (v1 Stateless) handles tools/list JSON-RPC request', async () => {
			const handleRequest = createMcpHttpHandler({ legacy: 'stateless' });

			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: mcpHeaders,
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/list',
					params: {},
				}),
			});

			const response = await handleRequest(request);
			expect(response.status).toBe(200);

			const data = await parseMcpResponse(response);
			expect(data.jsonrpc).toBe('2.0');
			expect(data.id).toBe(1);
			expect(data.result?.tools).toBeDefined();
			expect(data.result.tools).toHaveLength(19);
		});

		test('HTTP Legacy (v1 Stateless) handles resources/list and prompts/list', async () => {
			const handleRequest = createMcpHttpHandler({ legacy: 'stateless' });

			// Resources
			const resRequest = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: mcpHeaders,
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 2,
					method: 'resources/list',
					params: {},
				}),
			});
			const resResponse = await handleRequest(resRequest);
			expect(resResponse.status).toBe(200);
			const resData = await parseMcpResponse(resResponse);
			expect(resData.result?.resources).toHaveLength(2);

			// Prompts
			const promptRequest = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: mcpHeaders,
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 3,
					method: 'prompts/list',
					params: {},
				}),
			});
			const promptResponse = await handleRequest(promptRequest);
			expect(promptResponse.status).toBe(200);
			const promptData = await parseMcpResponse(promptResponse);
			expect(promptData.result?.prompts).toHaveLength(1);
		});

		test('HTTP Modern (v2) handles tools/call with structuredContent output', async () => {
			const handleRequest = createMcpHttpHandler();

			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: mcpHeaders,
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 4,
					method: 'tools/call',
					params: {
						name: 'npmSearch',
						arguments: { query: 'vitest', limit: 2 },
					},
				}),
			});

			const response = await handleRequest(request);
			expect(response.status).toBe(200);

			const data = await parseMcpResponse(response);
			expect(data.result?.content).toBeDefined();
			expect(data.result?.structuredContent).toBeDefined();
			expect(data.result.structuredContent.query).toBe('vitest');
			expect(data.result.structuredContent.results?.length).toBeGreaterThan(0);
		}, 30_000);

		test('HTTP Legacy (v1 2024/2025 Era) handles initialize handshake', async () => {
			const handleRequest = createMcpHttpHandler({ legacy: 'stateless' });

			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: mcpHeaders,
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 10,
					method: 'initialize',
					params: {
						protocolVersion: '2024-11-05',
						capabilities: {},
						clientInfo: {
							name: 'legacy-mcp-v1-client',
							version: '1.0.0',
						},
					},
				}),
			});

			const response = await handleRequest(request);
			expect(response.status).toBe(200);

			const data = await parseMcpResponse(response);
			expect(data.jsonrpc).toBe('2.0');
			expect(data.id).toBe(10);
			expect(data.result?.serverInfo?.name).toBe('npm-sentinel-mcp');
			expect(data.result?.capabilities?.tools).toBeDefined();
		});

		test('HTTP Modern (v2 2026 Era) handles initialize handshake', async () => {
			const handleRequest = createMcpHttpHandler();

			const request = new Request('http://localhost/mcp', {
				method: 'POST',
				headers: mcpHeaders,
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 11,
					method: 'initialize',
					params: {
						protocolVersion: '2026-07-28',
						capabilities: {
							tools: { listChanged: true },
						},
						clientInfo: {
							name: 'modern-mcp-v2-client',
							version: '2.0.0',
						},
					},
				}),
			});

			const response = await handleRequest(request);
			expect(response.status).toBe(200);

			const data = await parseMcpResponse(response);
			expect(data.jsonrpc).toBe('2.0');
			expect(data.id).toBe(11);
			expect(data.result?.serverInfo?.name).toBe('npm-sentinel-mcp');
			expect(data.result?.capabilities?.tools).toBeDefined();
		});
	});
});
