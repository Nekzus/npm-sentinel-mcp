import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { expect, vi } from 'vitest';

export function mockFetch(responseData: any = {}) {
	return vi.fn().mockImplementation(() =>
		Promise.resolve({
			ok: true,
			json: () => Promise.resolve({
				...mockNpmPackageInfo,
				...mockBundlephobiaData,
				...mockNpmDownloadsData,
				...mockNpmsIoData,
				...responseData
			}),
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
	name: 'express',
	'dist-tags': {
		latest: '4.18.2',
	},
	versions: {
		'4.18.2': {
			name: 'express',
			version: '4.18.2',
			description: 'Fast, unopinionated, minimalist web framework',
			author: {
				name: 'TJ Holowaychuk',
				email: 'tj@vision-media.ca'
			},
			license: 'MIT',
			dependencies: {
				'accepts': '~1.3.8',
				'array-flatten': '1.1.1',
				'body-parser': '1.20.1'
			},
			devDependencies: {
				'@types/express': '^4.17.14',
				'mocha': '^10.1.0',
				'typescript': '^4.8.4'
			},
			repository: {
				type: 'git',
				url: 'git+https://github.com/expressjs/express.git'
			}
		}
	},
	maintainers: [
		{
			name: 'dougwilson',
			email: 'doug@somethingdoug.com'
		}
	],
	readme: '# Express\n\nFast, unopinionated, minimalist web framework for Node.js',
	repository: {
		type: 'git',
		url: 'git+https://github.com/expressjs/express.git'
	}
} as const;

export const mockBundlephobiaData = {
	size: 224132,
	gzip: 84611,
	dependencyCount: 30,
	hasJSModule: true,
	hasJSNext: false,
	hasSideEffects: true
} as const;

export const mockNpmDownloadsData = {
	downloads: 45000000,
	start: '2024-01-01',
	end: '2024-01-31',
	package: 'express'
} as const;

export const mockNpmsIoData = {
	collected: {
		metadata: {
			name: 'express',
			version: '4.18.2',
			description: 'Fast, unopinionated, minimalist web framework',
			license: 'MIT'
		},
		npm: {
			downloads: [
				{ from: '2024-01-01', to: '2024-01-31', count: 45000000 }
			],
			dependentsCount: 150000,
			starsCount: 60000
		},
		github: {
			starsCount: 60000,
			forksCount: 10000,
			subscribersCount: 2000,
			issues: {
				openCount: 150,
				totalCount: 3000
			}
		}
	},
	score: {
		final: 0.9,
		detail: {
			quality: 0.9,
			popularity: 0.7,
			maintenance: 0.8
		}
	}
} as const;
