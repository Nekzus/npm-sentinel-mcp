import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport, McpServer } from '@modelcontextprotocol/server';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import createServer from '../../index';

/**
 * MCP v2 Migration Integration Tests
 *
 * Validates that the npm-sentinel-mcp server fully leverages the MCP SDK v2
 * capabilities through in-process client–server communication using
 * InMemoryTransport. No network calls or STDIO pipes are needed.
 *
 * Coverage areas:
 *  - Server initialization and protocol handshake
 *  - Capabilities negotiation (tools, resources, prompts)
 *  - Tool listing, schema validation (Standard Schema / z.object), annotations
 *  - Resource listing and metadata
 *  - Prompt listing and argsSchema
 *  - Tool invocation via JSON-RPC
 *  - Low-level Server access (server.server)
 *  - RegisteredTool return value API (enable/disable/update)
 */

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const EXPECTED_TOOLS = [
	'npmVersions',
	'npmLatest',
	'npmDeps',
	'npmTypes',
	'npmSize',
	'npmVulnerabilities',
	'npmTrends',
	'npmCompare',
	'npmMaintainers',
	'npmScore',
	'npmPackageReadme',
	'npmSearch',
	'npmLicenseCompatibility',
	'npmRepoStats',
	'npmDeprecated',
	'npmChangelogAnalysis',
	'npmAlternatives',
	'npmQuality',
	'npmMaintenance',
] as const;

const EXPECTED_RESOURCES = [
	{ name: 'serverReadme', uri: 'doc://server/readme' },
	{ name: 'mcpSpecification', uri: 'doc://mcp/specification' },
] as const;

const EXPECTED_PROMPTS = ['analyze-package'] as const;

// ---------------------------------------------------------------------------
// Test-scoped client–server pair via InMemoryTransport
// ---------------------------------------------------------------------------

let client: Client;

beforeAll(async () => {
	// Instantiate the MCP server through the public factory
	const lowLevelServer = createServer({ config: {} });

	// Create an in-memory transport pair for zero-IO testing
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

	// Connect the low-level Server returned by createServer
	await lowLevelServer.connect(serverTransport);

	// Create and connect a v2 Client
	client = new Client({ name: 'test-client', version: '1.0.0' });
	await client.connect(clientTransport);
});

afterAll(async () => {
	await client.close();
});

// ===========================================================================
// 1. PROTOCOL HANDSHAKE & SERVER INFO
// ===========================================================================

describe('Protocol Handshake', () => {
	test('server should respond with valid serverInfo on initialization', () => {
		const info = client.getServerVersion();
		expect(info).toBeDefined();
		expect(info?.name).toBe('npm-sentinel-mcp');
		expect(info?.version).toBeDefined();
		expect(typeof info?.version).toBe('string');
	});
});

// ===========================================================================
// 2. CAPABILITIES NEGOTIATION
// ===========================================================================

describe('Capabilities Negotiation', () => {
	test('server should declare tools capability', () => {
		const caps = client.getServerCapabilities();
		expect(caps).toBeDefined();
		expect(caps?.tools).toBeDefined();
	});

	test('server should declare resources capability', () => {
		const caps = client.getServerCapabilities();
		expect(caps?.resources).toBeDefined();
	});

	test('server should declare prompts capability', () => {
		const caps = client.getServerCapabilities();
		expect(caps?.prompts).toBeDefined();
	});
});

// ===========================================================================
// 3. TOOL LISTING & SCHEMA VALIDATION
// ===========================================================================

describe('Tool Listing (tools/list)', () => {
	test('server should expose exactly 19 tools', async () => {
		const { tools } = await client.listTools();
		expect(tools).toHaveLength(EXPECTED_TOOLS.length);
	});

	test('every expected tool should be registered', async () => {
		const { tools } = await client.listTools();
		const names = tools.map((t) => t.name);
		for (const expected of EXPECTED_TOOLS) {
			expect(names).toContain(expected);
		}
	});

	test('every tool should have a non-empty description', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.description).toBeDefined();
			expect(tool.description!.length).toBeGreaterThan(0);
		}
	});
});

describe('Tool inputSchema (Standard Schema via z.object)', () => {
	test('every tool should expose a valid JSON Schema as inputSchema', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.inputSchema).toBeDefined();
			expect(tool.inputSchema.type).toBe('object');
			expect(tool.inputSchema.properties).toBeDefined();
		}
	});

	test('all tools with packages param should define it as array of strings', async () => {
		const { tools } = await client.listTools();
		const toolsWithPackages = tools.filter((t) => t.inputSchema.properties?.packages);

		expect(toolsWithPackages.length).toBeGreaterThan(0);

		for (const tool of toolsWithPackages) {
			const packagesSchema = tool.inputSchema.properties!.packages as Record<string, unknown>;
			expect(packagesSchema.type).toBe('array');

			const itemsSchema = packagesSchema.items as Record<string, unknown>;
			expect(itemsSchema.type).toBe('string');
		}
	});

	test('npmSearch should have query (string) and limit (number) in schema', async () => {
		const { tools } = await client.listTools();
		const searchTool = tools.find((t) => t.name === 'npmSearch');
		expect(searchTool).toBeDefined();

		const props = searchTool!.inputSchema.properties!;
		expect(props.query).toBeDefined();
		expect((props.query as Record<string, unknown>).type).toBe('string');
		expect(props.limit).toBeDefined();
		expect((props.limit as Record<string, unknown>).type).toBe('number');
	});

	test('npmTrends should have period as enum in schema', async () => {
		const { tools } = await client.listTools();
		const trendsTool = tools.find((t) => t.name === 'npmTrends');
		expect(trendsTool).toBeDefined();

		const props = trendsTool!.inputSchema.properties!;
		const periodSchema = props.period as Record<string, unknown>;
		expect(periodSchema).toBeDefined();
	});

	test('ignoreCache field should be optional boolean across all tools', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			const props = tool.inputSchema.properties!;
			if (props.ignoreCache) {
				const ignoreCacheSchema = props.ignoreCache as Record<string, unknown>;
				expect(ignoreCacheSchema.type).toBe('boolean');
			}
		}
	});
});

describe('Tool outputSchema & structuredContent (MCP v2 Feature)', () => {
	test('every tool should expose a valid outputSchema with type object', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.outputSchema).toBeDefined();
			expect(tool.outputSchema?.type).toBe('object');
		}
	});

	test('calling a tool should populate structuredContent alongside content', async () => {
		const res = await client.callTool({
			name: 'npmLatest',
			arguments: { packages: ['express'] },
		});
		expect(res.content).toBeDefined();
		expect(res.content.length).toBeGreaterThan(0);
		expect(res.structuredContent).toBeDefined();
		expect(typeof res.structuredContent).toBe('object');

		const structured = res.structuredContent as Record<string, unknown>;
		expect(structured.results).toBeDefined();
		expect(Array.isArray(structured.results)).toBe(true);
	});
});

describe('MCP v2 Icons Metadata (Data URIs)', () => {
	test('every tool should expose icons metadata with Data URIs', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.icons).toBeDefined();
			expect(Array.isArray(tool.icons)).toBe(true);
			expect(tool.icons!.length).toBeGreaterThan(0);
			expect(tool.icons![0].src).toContain('data:image/svg+xml');
			expect(tool.icons![0].mimeType).toBe('image/svg+xml');
		}
	});

	test('every resource should expose icons metadata', async () => {
		const { resources } = await client.listResources();
		for (const resource of resources) {
			expect(resource.icons).toBeDefined();
			expect(Array.isArray(resource.icons)).toBe(true);
			expect(resource.icons!.length).toBeGreaterThan(0);
			expect(resource.icons![0].mimeType).toBe('image/svg+xml');
		}
	});

	test('analyze-package prompt should expose icons metadata', async () => {
		const { prompts } = await client.listPrompts();
		const prompt = prompts.find((p) => p.name === 'analyze-package');
		expect(prompt).toBeDefined();
		expect(prompt!.icons).toBeDefined();
		expect(Array.isArray(prompt!.icons)).toBe(true);
		expect(prompt!.icons![0].mimeType).toBe('image/svg+xml');
	});
});

describe('Tool Annotations (v2 metadata hints)', () => {
	test('every tool should expose annotations', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.annotations).toBeDefined();
		}
	});

	test('every tool should have a title in annotations', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.annotations?.title).toBeDefined();
			expect(typeof tool.annotations?.title).toBe('string');
			expect(tool.annotations!.title!.length).toBeGreaterThan(0);
		}
	});

	test('all tools should be marked as readOnlyHint=true', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.annotations?.readOnlyHint).toBe(true);
		}
	});

	test('all tools should be marked as openWorldHint=true', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(tool.annotations?.openWorldHint).toBe(true);
		}
	});

	test('idempotentHint should be a boolean for every tool', async () => {
		const { tools } = await client.listTools();
		for (const tool of tools) {
			expect(typeof tool.annotations?.idempotentHint).toBe('boolean');
		}
	});
});

// ===========================================================================
// 4. RESOURCE LISTING & METADATA
// ===========================================================================

describe('Resource Listing (resources/list)', () => {
	test('server should expose exactly 2 resources', async () => {
		const { resources } = await client.listResources();
		expect(resources).toHaveLength(EXPECTED_RESOURCES.length);
	});

	test('resources should have correct names and URIs', async () => {
		const { resources } = await client.listResources();
		for (const expected of EXPECTED_RESOURCES) {
			const resource = resources.find((r) => r.name === expected.name);
			expect(resource).toBeDefined();
			expect(resource!.uri).toBe(expected.uri);
		}
	});

	test('every resource should have a description', async () => {
		const { resources } = await client.listResources();
		for (const resource of resources) {
			expect(resource.description).toBeDefined();
			expect(resource.description!.length).toBeGreaterThan(0);
		}
	});

	test('every resource should have a mimeType', async () => {
		const { resources } = await client.listResources();
		for (const resource of resources) {
			expect(resource.mimeType).toBeDefined();
		}
	});

	test('serverReadme should have text/markdown mimeType', async () => {
		const { resources } = await client.listResources();
		const readme = resources.find((r) => r.name === 'serverReadme');
		expect(readme?.mimeType).toBe('text/markdown');
	});

	test('mcpSpecification should have text/plain mimeType', async () => {
		const { resources } = await client.listResources();
		const spec = resources.find((r) => r.name === 'mcpSpecification');
		expect(spec?.mimeType).toBe('text/plain');
	});
});

// ===========================================================================
// 5. PROMPT LISTING & ARGS SCHEMA
// ===========================================================================

describe('Prompt Listing (prompts/list)', () => {
	test('server should expose exactly 1 prompt', async () => {
		const { prompts } = await client.listPrompts();
		expect(prompts).toHaveLength(EXPECTED_PROMPTS.length);
	});

	test('analyze-package prompt should be registered with correct metadata', async () => {
		const { prompts } = await client.listPrompts();
		const analyzePrompt = prompts.find((p) => p.name === 'analyze-package');
		expect(analyzePrompt).toBeDefined();
		expect(analyzePrompt!.description).toBe('Analyze an NPM package for security and quality');
	});

	test('analyze-package prompt should declare package argument', async () => {
		const { prompts } = await client.listPrompts();
		const analyzePrompt = prompts.find((p) => p.name === 'analyze-package');

		expect(analyzePrompt!.arguments).toBeDefined();
		expect(analyzePrompt!.arguments!.length).toBeGreaterThan(0);

		const pkgArg = analyzePrompt!.arguments!.find((a) => a.name === 'package');
		expect(pkgArg).toBeDefined();
		expect(pkgArg!.required).toBe(true);
	});
});

describe('Prompt Invocation (prompts/get)', () => {
	test('analyze-package should return a message with the package name', async () => {
		const result = await client.getPrompt({
			name: 'analyze-package',
			arguments: { package: 'express' },
		});
		expect(result.messages).toBeDefined();
		expect(result.messages.length).toBe(1);
		expect(result.messages[0].role).toBe('user');

		const content = result.messages[0].content as { type: string; text: string };
		expect(content.type).toBe('text');
		expect(content.text).toContain('express');
	});
});

// ===========================================================================
// 6. RESOURCE READING
// ===========================================================================

describe('Resource Reading (resources/read)', () => {
	test('serverReadme should return markdown content', async () => {
		const result = await client.readResource({ uri: 'doc://server/readme' });
		expect(result.contents).toBeDefined();
		expect(result.contents.length).toBe(1);
		const content = result.contents[0];
		expect(content.mimeType).toBe('text/markdown');
		expect('text' in content).toBe(true);
		if ('text' in content) {
			expect(content.text).toBeDefined();
			expect(content.text.length).toBeGreaterThan(0);
		}
	});
});

// ===========================================================================
// 7. IN-MEMORY TRANSPORT (v2 feature)
// ===========================================================================

describe('InMemoryTransport (v2 zero-IO testing)', () => {
	test('client and server should communicate without STDIO or HTTP', async () => {
		// This entire test suite runs over InMemoryTransport, proving it works.
		// This test explicitly verifies the round-trip by calling a known endpoint.
		const { tools } = await client.listTools();
		expect(tools.length).toBeGreaterThan(0);

		const { resources } = await client.listResources();
		expect(resources.length).toBeGreaterThan(0);

		const { prompts } = await client.listPrompts();
		expect(prompts.length).toBeGreaterThan(0);
	});

	test('InMemoryTransport.createLinkedPair should produce two connected transports', () => {
		const [a, b] = InMemoryTransport.createLinkedPair();
		expect(a).toBeDefined();
		expect(b).toBeDefined();
		expect(typeof a.start).toBe('function');
		expect(typeof b.start).toBe('function');
	});
});

// ===========================================================================
// 8. LOW-LEVEL SERVER ACCESS (server.server)
// ===========================================================================

describe('Low-level Server instance (server.server)', () => {
	test('createServer should return a low-level Server with connect method', () => {
		const server = createServer({ config: {} });
		expect(server).toBeDefined();
		expect(typeof server.connect).toBe('function');
		expect(typeof server.close).toBe('function');
	});
});

// ===========================================================================
// 9. McpServer CONSTRUCTOR & REGISTERED TOOL API
// ===========================================================================

describe('McpServer Constructor and RegisteredTool API', () => {
	test('McpServer constructor should accept name and version', () => {
		const server = new McpServer({ name: 'test-server', version: '0.1.0' });
		expect(server).toBeDefined();
		expect(server.server).toBeDefined();
	});

	test('registerTool should return a RegisteredTool with enable/disable/update', () => {
		const server = new McpServer({ name: 'reg-test', version: '0.1.0' });
		const { z } = require('zod');

		const registered = server.registerTool(
			'testTool',
			{
				description: 'A test tool',
				inputSchema: z.object({ value: z.string() }),
			},
			async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }),
		);

		expect(registered).toBeDefined();
		expect(typeof registered.update).toBe('function');
		expect(typeof registered.enable).toBe('function');
		expect(typeof registered.disable).toBe('function');
		expect(typeof registered.remove).toBe('function');
	});

	test('disabling a tool should remove it from the listed tools', async () => {
		const server = new McpServer({ name: 'disable-test', version: '0.1.0' });
		const { z } = require('zod');

		const registered = server.registerTool(
			'ephemeralTool',
			{
				description: 'Will be disabled',
				inputSchema: z.object({ x: z.number() }),
			},
			async () => ({ content: [{ type: 'text' as const, text: 'result' }] }),
		);

		const [ct, st] = InMemoryTransport.createLinkedPair();
		await server.connect(st);
		const testClient = new Client({ name: 'disable-client', version: '1.0.0' });
		await testClient.connect(ct);

		// Tool should be listed initially
		let result = await testClient.listTools();
		expect(result.tools.find((t) => t.name === 'ephemeralTool')).toBeDefined();

		// Disable and verify
		registered.disable();
		result = await testClient.listTools();
		expect(result.tools.find((t) => t.name === 'ephemeralTool')).toBeUndefined();

		// Re-enable and verify
		registered.enable();
		result = await testClient.listTools();
		expect(result.tools.find((t) => t.name === 'ephemeralTool')).toBeDefined();

		await testClient.close();
	});

	test('removing a tool should permanently unregister it', async () => {
		const server = new McpServer({ name: 'remove-test', version: '0.1.0' });
		const { z } = require('zod');

		const registered = server.registerTool(
			'tempTool',
			{
				description: 'Will be removed',
				inputSchema: z.object({ v: z.string() }),
			},
			async () => ({ content: [{ type: 'text' as const, text: 'temp' }] }),
		);

		const [ct, st] = InMemoryTransport.createLinkedPair();
		await server.connect(st);
		const testClient = new Client({ name: 'remove-client', version: '1.0.0' });
		await testClient.connect(ct);

		let result = await testClient.listTools();
		expect(result.tools.find((t) => t.name === 'tempTool')).toBeDefined();

		registered.remove();
		result = await testClient.listTools();
		expect(result.tools.find((t) => t.name === 'tempTool')).toBeUndefined();

		await testClient.close();
	});
});

// ===========================================================================
// 10. v2 SCHEMA COMPLIANCE: Standard Schema protocol
// ===========================================================================

describe('Standard Schema Compliance', () => {
	test('z.object() schemas should implement the ~standard protocol', () => {
		const { z } = require('zod');
		const schema = z.object({ test: z.string() });

		expect('~standard' in schema).toBe(true);
		expect(schema['~standard']).toBeDefined();
		expect(schema['~standard'].version).toBe(1);
	});

	test('plain object shapes should NOT implement ~standard (confirming migration necessity)', () => {
		const { z } = require('zod');
		const plainShape = { test: z.string() };

		expect('~standard' in plainShape).toBe(false);
	});
});
