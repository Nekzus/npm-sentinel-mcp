import { beforeEach, describe, expect, test, vi } from 'vitest';
import { handleNpmPackageReadme } from '../../index';
import { extractTextFromResponse, validateToolResponse } from '../utils/test-helpers';

// Definir Map para mockear respuestas específicas
const mockResponses = new Map<string, () => Promise<any>>();

const createMockResponse = (body: any, ok = true, status = 200) => {
	return Promise.resolve({
		ok,
		status,
		statusText: ok ? 'OK' : 'Not Found',
		json: () => Promise.resolve(body),
		text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
		headers: new Map(),
	});
};

vi.mock('node-fetch', () => {
	return {
		default: vi.fn().mockImplementation((url: string) => {
			if (mockResponses.has(url)) {
				return mockResponses.get(url)!();
			}
			// Fallback mock para el registry
			if (url.includes('registry.npmjs.org/zod')) {
				return createMockResponse({
					name: 'zod',
					'dist-tags': { latest: '4.4.3' },
					versions: {
						'4.4.3': {
							name: 'zod',
							version: '4.4.3',
							readme: null, // Sin README en el registry
						},
					},
				});
			}
			// Fallback mock por defecto
			return Promise.resolve({
				ok: false,
				status: 404,
				statusText: 'Not Found',
				headers: new Map(),
			});
		}),
	};
});

describe('handleNpmPackageReadme CDN Fallback', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResponses.clear();
	});

	test('should fallback to jsDelivr CDN when registry readme is null', async () => {
		mockResponses.set('https://cdn.jsdelivr.net/npm/zod@4.4.3/README.md', () =>
			createMockResponse('# Zod README from jsDelivr', true, 200),
		);

		const result = await handleNpmPackageReadme({ packages: ['zod'], ignoreCache: true });
		validateToolResponse(result);
		const parsed = JSON.parse(extractTextFromResponse(result));

		expect(parsed.results[0].data.readme).toContain('# Zod README from jsDelivr');
		expect(parsed.results[0].data.readme).toContain('<untrusted_external_content');
		expect(parsed.results[0].data.hasReadme).toBe(true);
		expect(parsed.results[0].data.readmeSource).toBe('cdn');
	});

	test('should fallback to unpkg when jsDelivr fails', async () => {
		// jsDelivr responde con 404
		mockResponses.set('https://cdn.jsdelivr.net/npm/zod@4.4.3/README.md', () =>
			Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', headers: new Map() }),
		);

		// unpkg responde con éxito
		mockResponses.set('https://unpkg.com/zod@4.4.3/README.md', () =>
			createMockResponse('# Zod README from unpkg', true, 200),
		);

		const result = await handleNpmPackageReadme({ packages: ['zod'], ignoreCache: true });
		validateToolResponse(result);
		const parsed = JSON.parse(extractTextFromResponse(result));

		expect(parsed.results[0].packageName).toBe('zod');
		expect(parsed.results[0].status).toBe('success');
		expect(parsed.results[0].data.readme).toContain('# Zod README from unpkg');
		expect(parsed.results[0].data.readme).toContain('<untrusted_external_content');
		expect(parsed.results[0].data.hasReadme).toBe(true);
		expect(parsed.results[0].data.readmeSource).toBe('cdn');
	});

	test('should return hasReadme: false and readmeSource: null if all fail', async () => {
		// Ambos CDNs fallan
		mockResponses.set('https://cdn.jsdelivr.net/npm/zod@4.4.3/README.md', () =>
			Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', headers: new Map() }),
		);
		mockResponses.set('https://unpkg.com/zod@4.4.3/README.md', () =>
			Promise.resolve({ ok: false, status: 404, statusText: 'Not Found', headers: new Map() }),
		);

		const result = await handleNpmPackageReadme({ packages: ['zod'], ignoreCache: true });
		validateToolResponse(result);
		const parsed = JSON.parse(extractTextFromResponse(result));

		expect(parsed.results[0].packageName).toBe('zod');
		expect(parsed.results[0].status).toBe('success');
		expect(parsed.results[0].data.readme).toBeNull();
		expect(parsed.results[0].data.hasReadme).toBe(false);
		expect(parsed.results[0].data.readmeSource).toBeNull();
	});
});
