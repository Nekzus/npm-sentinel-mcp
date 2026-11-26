import { describe, expect, it } from 'vitest';
import { getNpmRegistryUrl, setNpmRegistryUrl } from '../../index.js';
import { createMcpHttpHandler } from '../../src/http.js';

function findSchemaPortabilityIssues(node: unknown, path = '$'): string[] {
	const issues: string[] = [];
	if (!node || typeof node !== 'object' || Array.isArray(node)) {
		return issues;
	}

	const record = node as Record<string, unknown>;

	if (Array.isArray(record.type)) {
		issues.push(`${path}.type is an array (${JSON.stringify(record.type)})`);
	}

	if (
		'additionalProperties' in record &&
		typeof record.additionalProperties === 'object' &&
		record.additionalProperties !== null &&
		!Array.isArray(record.additionalProperties) &&
		Object.keys(record.additionalProperties).length === 0
	) {
		issues.push(`${path}.additionalProperties is an empty schema {}`);
	}

	if (record.properties && typeof record.properties === 'object') {
		for (const [key, propSchema] of Object.entries(record.properties as Record<string, unknown>)) {
			if (
				propSchema &&
				typeof propSchema === 'object' &&
				!Array.isArray(propSchema) &&
				Object.keys(propSchema).length === 0
			) {
				issues.push(`${path}.properties.${key} is an empty schema {}`);
			} else {
				issues.push(...findSchemaPortabilityIssues(propSchema, `${path}.properties.${key}`));
			}
		}
	}

	if (record.items && typeof record.items === 'object') {
		if (!Array.isArray(record.items) && Object.keys(record.items).length === 0) {
			issues.push(`${path}.items is an empty schema {}`);
		} else {
			issues.push(...findSchemaPortabilityIssues(record.items, `${path}.items`));
		}
	}

	for (const combinator of ['anyOf', 'oneOf', 'allOf'] as const) {
		const branches = record[combinator];
		if (Array.isArray(branches)) {
			branches.forEach((branch, idx) => {
				if (
					branch &&
					typeof branch === 'object' &&
					!Array.isArray(branch) &&
					Object.keys(branch).length === 0
				) {
					issues.push(`${path}.${combinator}[${idx}] is an empty schema {}`);
				} else {
					issues.push(...findSchemaPortabilityIssues(branch, `${path}.${combinator}[${idx}]`));
				}
			});
		}
	}

	if (
		record.additionalProperties &&
		typeof record.additionalProperties === 'object' &&
		!Array.isArray(record.additionalProperties) &&
		Object.keys(record.additionalProperties).length > 0
	) {
		issues.push(
			...findSchemaPortabilityIssues(record.additionalProperties, `${path}.additionalProperties`),
		);
	}

	return issues;
}

describe('Schema Portability & Unified Config', () => {
	it('should expose all 19 tools without empty schemas or additionalProperties: {} in outputSchema', async () => {
		const handleRequest = createMcpHttpHandler();
		const request = new Request('http://localhost/mcp', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 'schema-portability-1',
				method: 'tools/list',
				params: {},
			}),
		});

		const response = await handleRequest(request);
		expect(response.status).toBe(200);

		const text = await response.text();
		const dataLine = text.split('\n').find((line) => line.startsWith('data: '));
		const parsed = JSON.parse(dataLine ? dataLine.slice(6).trim() : text);

		const tools = parsed.result?.tools;
		expect(Array.isArray(tools)).toBe(true);
		expect(tools).toHaveLength(19);

		for (const tool of tools) {
			expect(tool.outputSchema, `Tool ${tool.name} should define outputSchema`).toBeDefined();
			const outputIssues = findSchemaPortabilityIssues(
				tool.outputSchema,
				`${tool.name}.outputSchema`,
			);
			expect(
				outputIssues,
				`Portability issues in ${tool.name}: ${outputIssues.join('; ')}`,
			).toEqual([]);

			if (tool.inputSchema) {
				const inputIssues = findSchemaPortabilityIssues(
					tool.inputSchema,
					`${tool.name}.inputSchema`,
				);
				expect(inputIssues, `Input issues in ${tool.name}: ${inputIssues.join('; ')}`).toEqual([]);
			}
		}
	});

	it('should propagate npmRegistryUrl from createMcpHttpHandler to index.ts config', () => {
		const originalUrl = getNpmRegistryUrl();
		try {
			createMcpHttpHandler({ npmRegistryUrl: 'https://custom-registry.example.com/' });
			expect(getNpmRegistryUrl()).toBe('https://custom-registry.example.com');
		} finally {
			setNpmRegistryUrl(originalUrl);
		}
	});
});
