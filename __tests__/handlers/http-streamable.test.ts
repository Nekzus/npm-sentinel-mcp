import { describe, expect, it } from 'vitest';
import { handleStreamableHttpRequest } from '../../src/http.js';

describe('Streamable HTTP POST Transport Handler (MCP v2)', () => {
	it('should process a tools/list request and return valid NDJSON response', async () => {
		const requestPayload = {
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/list',
			params: {},
		};

		const response = await handleStreamableHttpRequest(requestPayload);
		expect(response.status).toBe(200);
		expect(response.headers['Content-Type']).toBe('application/x-ndjson');

		const parsed = JSON.parse(response.body.trim());
		expect(parsed.id).toBe(1);
		expect(parsed.result?.tools).toBeDefined();
		expect(parsed.result.tools.length).toBe(19);
	});

	it('should process a tool execution request (npmLatest) with dual response', async () => {
		const requestPayload = {
			jsonrpc: '2.0',
			id: 2,
			method: 'tools/call',
			params: {
				name: 'npmLatest',
				arguments: { packages: ['express'] },
			},
		};

		const response = await handleStreamableHttpRequest(requestPayload);
		expect(response.status).toBe(200);

		const parsed = JSON.parse(response.body.trim());
		expect(parsed.id).toBe(2);
		expect(parsed.result?.content).toBeDefined();
		expect(parsed.result?.structuredContent).toBeDefined();
	});

	it('should return status 400 for invalid non-object payload', async () => {
		const response = await handleStreamableHttpRequest('invalid-payload');
		expect(response.status).toBe(400);

		const parsed = JSON.parse(response.body);
		expect(parsed.error?.code).toBe(-32600);
	});
});
