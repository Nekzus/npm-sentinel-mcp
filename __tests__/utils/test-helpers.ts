import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { expect, vi } from 'vitest';

export function mockFetch(responseData: any) {
	return vi.fn().mockImplementation(() =>
		Promise.resolve({
			ok: true,
			json: () => Promise.resolve(responseData),
			text: () => Promise.resolve(JSON.stringify(responseData)),
		}),
	);
}

export function mockErrorFetch(status = 404, statusText = 'Not Found') {
	return vi.fn().mockImplementation(() =>
		Promise.resolve({
			ok: false,
			status,
			statusText,
			json: () => Promise.reject(new Error(statusText)),
			text: () => Promise.reject(new Error(statusText)),
		}),
	);
}

export function validateToolResponse(response: CallToolResult) {
	expect(response).toBeDefined();
	expect(response.content).toBeDefined();
	expect(Array.isArray(response.content)).toBe(true);
	expect(response.content.length).toBeGreaterThan(0);

	for (const item of response.content) {
		expect(item).toHaveProperty('type');
		expect(item).toHaveProperty('text');
		expect(typeof item.type).toBe('string');
		expect(typeof item.text).toBe('string');
	}
}

export const mockNpmPackageInfo = {
	name: 'test-package',
	'dist-tags': {
		latest: '1.0.0',
	},
	versions: {
		'1.0.0': {
			name: 'test-package',
			version: '1.0.0',
			description: 'Test package',
			author: {
				name: 'Test Author',
			},
			license: 'MIT',
		},
	},
	maintainers: [
		{
			name: 'test-maintainer',
			email: 'test@example.com',
		},
	],
} as const;

export const mockBundlephobiaData = {
	size: 1000,
	gzip: 500,
	dependencyCount: 5,
} as const;

export const mockNpmDownloadsData = {
	downloads: 1000,
	start: '2024-01-01',
	end: '2024-01-31',
	package: 'test-package',
} as const;
