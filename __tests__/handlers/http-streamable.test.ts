import { describe, expect, it } from 'vitest';
import { createMcpHttpHandler } from '../../src/http.js';

describe('createMcpHttpHandler (Dual-Era MCP v1 & v2)', () => {
	const handleRequest = createMcpHttpHandler();
	const defaultHeaders = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream',
	};

	function parseResponse(text: string) {
		if (text.includes('data: ')) {
			const dataLine = text.split('\n').find((line) => line.startsWith('data: '));
			if (dataLine) {
				return JSON.parse(dataLine.slice(6).trim());
			}
		}
		return JSON.parse(text);
	}

	it('should handle server/discover probe for modern protocol era (2026-07-28)', async () => {
		const request = new Request('http://localhost/mcp', {
			method: 'POST',
			headers: {
				...defaultHeaders,
				'Mcp-Method': 'server/discover',
				'Mcp-Protocol-Version': '2026-07-28',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 'probe-1',
				method: 'server/discover',
				params: {
					_meta: {
						'io.modelcontextprotocol/protocolVersion': '2026-07-28',
						'io.modelcontextprotocol/clientInfo': {
							name: 'test-client',
							version: '1.0.0',
						},
						'io.modelcontextprotocol/clientCapabilities': {},
					},
				},
			}),
		});

		const response = await handleRequest(request);
		expect(response.status).toBe(200);

		const text = await response.text();
		const parsed = parseResponse(text);
		expect(parsed.id).toBe('probe-1');
		expect(parsed.result?.supportedVersions).toContain('2026-07-28');
		expect(parsed.result?.capabilities).toBeDefined();
	});

	it('should process a tools/list request and return valid JSON-RPC tools list', async () => {
		const request = new Request('http://localhost/mcp', {
			method: 'POST',
			headers: defaultHeaders,
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/list',
				params: {},
			}),
		});

		const response = await handleRequest(request);
		expect(response.status).toBe(200);

		const text = await response.text();
		const parsed = parseResponse(text);
		expect(parsed.id).toBe(1);
		expect(parsed.result?.tools).toBeDefined();
		expect(parsed.result.tools.length).toBeGreaterThanOrEqual(19);
	});

	it('should process a resources/list request (Primitive 2: Resources)', async () => {
		const request = new Request('http://localhost/mcp', {
			method: 'POST',
			headers: defaultHeaders,
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 2,
				method: 'resources/list',
				params: {},
			}),
		});

		const response = await handleRequest(request);
		expect(response.status).toBe(200);

		const text = await response.text();
		const parsed = parseResponse(text);
		expect(parsed.id).toBe(2);
		expect(parsed.result?.resources).toBeDefined();
	});

	it('should process a prompts/list request (Primitive 3: Prompts)', async () => {
		const request = new Request('http://localhost/mcp', {
			method: 'POST',
			headers: defaultHeaders,
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 3,
				method: 'prompts/list',
				params: {},
			}),
		});

		const response = await handleRequest(request);
		expect(response.status).toBe(200);

		const text = await response.text();
		const parsed = parseResponse(text);
		expect(parsed.id).toBe(3);
		expect(parsed.result?.prompts).toBeDefined();
	});

	it('should process a tool execution request (npmLatest) with structured output', async () => {
		const request = new Request('http://localhost/mcp', {
			method: 'POST',
			headers: defaultHeaders,
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 4,
				method: 'tools/call',
				params: {
					name: 'npmLatest',
					arguments: { packages: ['express'] },
				},
			}),
		});

		const response = await handleRequest(request);
		expect(response.status).toBe(200);

		const text = await response.text();
		const parsed = parseResponse(text);
		expect(parsed.id).toBe(4);
		expect(parsed.result?.content).toBeDefined();
		expect(parsed.result?.structuredContent).toBeDefined();
	});

	it('should return 400 for malformed JSON request body', async () => {
		const request = new Request('http://localhost/mcp', {
			method: 'POST',
			headers: defaultHeaders,
			body: 'invalid-json-payload',
		});

		const response = await handleRequest(request);
		expect(response.status).toBe(400);
	});
});
