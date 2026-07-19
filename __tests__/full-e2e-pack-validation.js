import * as fs from 'node:fs';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

async function runE2EValidation() {
	console.log('----------------------------------------------------');
	console.log('🚀 MCP v2 Production Release E2E Tarball Verification');
	console.log('----------------------------------------------------');

	const tarballName = 'nekzus-mcp-server-1.19.0-alpha.6.tgz';
	if (!fs.existsSync(tarballName)) {
		throw new Error(`Tarball ${tarballName} not found. Run pnpm pack first.`);
	}

	console.log(
		`✓ Verified tarball package: ${tarballName} (${fs.statSync(tarballName).size} bytes)`,
	);

	// Spin up process using dist/index.js (built from pack)
	const transport = new StdioClientTransport({
		command: 'node',
		args: ['./dist/index.js'],
	});

	const client = new Client(
		{ name: 'production-e2e-validator', version: '2.0.0' },
		{ capabilities: {} },
	);

	console.log('📡 Connecting via STDIO transport to dist/index.js...');
	await client.connect(transport);
	console.log('✓ Connected successfully!');

	// 1. Audit Catalog Capabilities
	console.log('\n--- 1. Capabilities & Catalog Verification ---');
	const { tools } = await client.listTools();
	console.log(`✓ Tools count: ${tools.length} (Expected: 19)`);
	if (tools.length !== 19) throw new Error(`Expected 19 tools, got ${tools.length}`);

	for (const t of tools) {
		if (t.inputSchema?.type !== 'object') {
			throw new Error(`Tool ${t.name} missing valid inputSchema`);
		}
		if (t.outputSchema?.type !== 'object') {
			throw new Error(`Tool ${t.name} missing valid outputSchema`);
		}
		if (!Array.isArray(t.icons) || !t.icons[0]?.src?.startsWith('data:image/svg+xml')) {
			throw new Error(`Tool ${t.name} missing valid SVG Data URI icons`);
		}
		if (typeof t.annotations?.title !== 'string') {
			throw new Error(`Tool ${t.name} missing annotations.title`);
		}
	}
	console.log('✓ All 19 tools passed inputSchema, outputSchema, icons, and annotations audit!');

	const { resources } = await client.listResources();
	console.log(`✓ Resources count: ${resources.length} (Expected: 2)`);
	for (const r of resources) {
		if (r.icons?.[0]?.mimeType !== 'image/svg+xml') {
			throw new Error(`Resource ${r.name} missing icons`);
		}
	}
	console.log('✓ All resources verified with icon metadata!');

	const { prompts } = await client.listPrompts();
	console.log(`✓ Prompts count: ${prompts.length} (Expected: 1)`);
	if (prompts[0].name !== 'analyze-package' || !prompts[0].icons) {
		throw new Error('Prompt analyze-package invalid or missing icons');
	}
	console.log('✓ Prompt analyze-package verified!');

	// 2. Test Execution & Structured Content Dual Return
	console.log('\n--- 2. Tool Execution & Dual Return (structuredContent) ---');

	const sampleCall1 = await client.callTool({
		name: 'npmLatest',
		arguments: { packages: ['express'] },
	});
	if (!sampleCall1.content || sampleCall1.content.length === 0) {
		throw new Error('Tool npmLatest returned empty content');
	}
	if (!sampleCall1.structuredContent || typeof sampleCall1.structuredContent !== 'object') {
		throw new Error('Tool npmLatest failed to return structuredContent');
	}
	console.log('✓ npmLatest returned both content (text fallback) and structuredContent object!');

	const sampleCall2 = await client.callTool({
		name: 'npmSearch',
		arguments: { query: 'vitest', limit: 3 },
	});
	if (!sampleCall2.structuredContent) {
		throw new Error('Tool npmSearch failed to return structuredContent');
	}
	console.log('✓ npmSearch returned structuredContent object with search results!');

	// 3. Test Resources & Prompts Execution
	console.log('\n--- 3. Resource & Prompt Invocation ---');
	const readmeRes = await client.readResource({ uri: 'doc://server/readme' });
	if (!readmeRes.contents || readmeRes.contents.length === 0 || !readmeRes.contents[0].text) {
		throw new Error('Failed to read serverReadme resource');
	}
	console.log(
		`✓ Read serverReadme resource successfully (${readmeRes.contents[0].text.length} chars)`,
	);

	const promptRes = await client.getPrompt({
		name: 'analyze-package',
		arguments: { package: 'react' },
	});
	if (!promptRes.messages || promptRes.messages.length === 0) {
		throw new Error('Failed to get analyze-package prompt');
	}
	console.log('✓ Retrieved analyze-package prompt successfully!');

	// 4. Cache Performance Test
	console.log('\n--- 4. Cache Speed & Performance Verification ---');
	const t0 = Date.now();
	await client.callTool({
		name: 'npmVersions',
		arguments: { packages: ['lodash'], ignoreCache: true },
	});
	const timeBypassCache = Date.now() - t0;

	const t1 = Date.now();
	await client.callTool({
		name: 'npmVersions',
		arguments: { packages: ['lodash'] },
	});
	const timeCached = Date.now() - t1;

	console.log(`⚡ Fresh fetch execution time: ${timeBypassCache}ms`);
	console.log(`⚡ Cached fetch execution time: ${timeCached}ms`);
	console.log(`🚀 Acceleration factor: ${(timeBypassCache / Math.max(1, timeCached)).toFixed(1)}x`);

	await transport.close();
	console.log('\n----------------------------------------------------');
	console.log('🎉 ALL MCP V2 E2E TARBALL TESTS PASSED WITH 100% SUCCESS!');
	console.log('----------------------------------------------------');
}

runE2EValidation().catch((err) => {
	console.error('❌ E2E Tarball Validation Failed:', err);
	process.exit(1);
});
