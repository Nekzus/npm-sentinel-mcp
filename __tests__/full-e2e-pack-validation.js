import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

async function runE2EValidation() {
	console.log('====================================================');
	console.log('🚀 MCP v2 REAL WORLD CONSUMER PRODUCTION TEST');
	console.log('====================================================');

	const projectDir = process.cwd();
	const packageJsonPath = path.join(projectDir, 'package.json');
	const pkgInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	const tarballName = `nekzus-mcp-server-${pkgInfo.version}.tgz`;
	const tarballPath = path.join(projectDir, tarballName);

	// 1. Pack tarball if missing or build
	console.log('📦 Step 1: Packing npm package via `npm pack`...');
	child_process.execSync('npm run build && npm pack', { stdio: 'inherit' });

	if (!fs.existsSync(tarballPath)) {
		throw new Error(`Tarball ${tarballName} was not found at ${tarballPath}`);
	}
	const tarballSize = fs.statSync(tarballPath).size;
	console.log(
		`✓ Generated production tarball: ${tarballName} (${(tarballSize / 1024).toFixed(1)} KB)`,
	);

	// 2. Set up isolated consumer project directory
	const consumerDir = path.join(projectDir, '.e2e-consumer-test');
	if (fs.existsSync(consumerDir)) {
		fs.rmSync(consumerDir, { recursive: true, force: true });
	}
	fs.mkdirSync(consumerDir, { recursive: true });

	console.log('\n🏗️ Step 2: Creating isolated consumer project & installing tarball...');
	fs.writeFileSync(
		path.join(consumerDir, 'package.json'),
		JSON.stringify(
			{
				name: 'e2e-consumer',
				version: '1.0.0',
				type: 'module',
			},
			null,
			2,
		),
	);

	// Install the tarball into consumer project
	child_process.execSync(`npm install --no-save "${tarballPath}"`, {
		cwd: consumerDir,
		stdio: 'inherit',
	});
	console.log('✓ Package installed successfully into consumer project node_modules!');

	// 3. Test Part 1: STDIO Transport Execution (npx / CLI binary)
	console.log('\n----------------------------------------------------');
	console.log('🔌 PART 1: STDIO Transport & CLI Binary Verification');
	console.log('----------------------------------------------------');

	const installedBin = path.join(
		consumerDir,
		'node_modules',
		'@nekzus',
		'mcp-server',
		'dist',
		'index.js',
	);
	const transport = new StdioClientTransport({
		command: 'node',
		args: [installedBin],
	});

	const client = new Client(
		{ name: 'real-world-e2e-client', version: '2.0.0' },
		{ capabilities: {} },
	);

	console.log('📡 Connecting client to STDIO server...');
	await client.connect(transport);
	console.log('✓ Connected successfully over STDIO!');

	// Audit Tools, Resources, Prompts
	const { tools } = await client.listTools();
	console.log(`✓ Tools catalog count: ${tools.length} (Expected >= 19)`);
	if (tools.length < 19) throw new Error(`Expected at least 19 tools, found ${tools.length}`);

	const { resources } = await client.listResources();
	console.log(`✓ Resources catalog count: ${resources.length}`);

	const { prompts } = await client.listPrompts();
	console.log(`✓ Prompts catalog count: ${prompts.length}`);

	// Execute tool call over STDIO
	console.log('\n⚙️ Executing `npmLatest` tool call over STDIO...');
	const stdioToolResult = await client.callTool({
		name: 'npmLatest',
		arguments: { packages: ['express'] },
	});
	if (!stdioToolResult.content || !stdioToolResult.structuredContent) {
		throw new Error('STDIO tool call failed to return content and structuredContent');
	}
	console.log('✓ STDIO tool execution returned valid dual text & structuredContent!');

	await transport.close();
	console.log('✓ STDIO connection closed cleanly.');

	// 4. Test Part 2: WebStandardStreamableHTTPServerTransport Execution
	console.log('\n----------------------------------------------------');
	console.log('🌐 PART 2: WebStandardStreamableHTTPServerTransport Verification');
	console.log('----------------------------------------------------');

	const httpModulePath = path.join(
		consumerDir,
		'node_modules',
		'@nekzus',
		'mcp-server',
		'dist',
		'src',
		'http.js',
	);
	const { createMcpHttpHandler, WebStandardStreamableHTTPServerTransport } = await import(
		`file://${httpModulePath.replace(/\\/g, '/')}`
	);

	if (
		typeof createMcpHttpHandler !== 'function' ||
		typeof WebStandardStreamableHTTPServerTransport !== 'function'
	) {
		throw new Error(
			'Failed to import createMcpHttpHandler or WebStandardStreamableHTTPServerTransport from @nekzus/mcp-server/http',
		);
	}
	console.log(
		'✓ Successfully imported createMcpHttpHandler & WebStandardStreamableHTTPServerTransport from @nekzus/mcp-server/http!',
	);

	const handleMcpRequest = createMcpHttpHandler();
	const defaultHeaders = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
	};

	// Test 2.1: Tools List over HTTP
	console.log('\n📡 HTTP Request 1: `tools/list`...');
	const toolsReq = new Request('http://localhost/mcp', {
		method: 'POST',
		headers: defaultHeaders,
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 101,
			method: 'tools/list',
			params: {},
		}),
	});
	const toolsRes = await handleMcpRequest(toolsReq);
	if (toolsRes.status !== 200) {
		throw new Error(`HTTP tools/list failed with status ${toolsRes.status}`);
	}
	const toolsJson = JSON.parse(await toolsRes.text());
	console.log(
		`✓ HTTP tools/list returned status 200 with ${toolsJson.result?.tools?.length} tools!`,
	);

	// Test 2.2: Resources List over HTTP (Primitive 2)
	console.log('\n📡 HTTP Request 2: `resources/list` (Primitive 2)...');
	const resReq = new Request('http://localhost/mcp', {
		method: 'POST',
		headers: defaultHeaders,
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 102,
			method: 'resources/list',
			params: {},
		}),
	});
	const resRes = await handleMcpRequest(resReq);
	if (resRes.status !== 200) {
		throw new Error(`HTTP resources/list failed with status ${resRes.status}`);
	}
	const resJson = JSON.parse(await resRes.text());
	console.log(
		`✓ HTTP resources/list returned status 200 with ${resJson.result?.resources?.length} resources!`,
	);

	// Test 2.3: Prompts List over HTTP (Primitive 3)
	console.log('\n📡 HTTP Request 3: `prompts/list` (Primitive 3)...');
	const promptReq = new Request('http://localhost/mcp', {
		method: 'POST',
		headers: defaultHeaders,
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 103,
			method: 'prompts/list',
			params: {},
		}),
	});
	const promptRes = await handleMcpRequest(promptReq);
	if (promptRes.status !== 200) {
		throw new Error(`HTTP prompts/list failed with status ${promptRes.status}`);
	}
	const promptJson = JSON.parse(await promptRes.text());
	console.log(
		`✓ HTTP prompts/list returned status 200 with ${promptJson.result?.prompts?.length} prompts!`,
	);

	// Test 2.4: Tools Call over HTTP
	console.log('\n📡 HTTP Request 4: `tools/call` (npmSearch)...');
	const callReq = new Request('http://localhost/mcp', {
		method: 'POST',
		headers: defaultHeaders,
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 104,
			method: 'tools/call',
			params: {
				name: 'npmSearch',
				arguments: { query: 'vitest', limit: 2 },
			},
		}),
	});
	const callRes = await handleMcpRequest(callReq);
	if (callRes.status !== 200) {
		throw new Error(`HTTP tools/call failed with status ${callRes.status}`);
	}
	const callJson = JSON.parse(await callRes.text());
	if (!callJson.result?.structuredContent) {
		throw new Error('HTTP tool call missing structuredContent');
	}
	console.log('✓ HTTP tools/call returned status 200 with structuredContent!');

	// 5. Cleanup consumer directory and generated tarball
	console.log('\n🧹 Step 5: Cleaning up consumer test directory and tarball...');
	fs.rmSync(consumerDir, { recursive: true, force: true });
	if (fs.existsSync(tarballPath)) {
		fs.rmSync(tarballPath, { force: true });
	}
	console.log('✓ Cleanup complete!');

	console.log('\n====================================================');
	console.log('🎉 ALL REAL-WORLD NPM CONSUMER TESTS PASSED WITH 100% SUCCESS!');
	console.log('====================================================\n');
}

runE2EValidation().catch((err) => {
	console.error('❌ Real World E2E Pack Validation Failed:', err);
	process.exit(1);
});
