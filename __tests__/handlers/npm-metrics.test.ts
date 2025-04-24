import fetch from 'node-fetch';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mockFetch, mockNpmDownloadsData, validateToolResponse } from '../utils/test-helpers.js';

vi.mock('node-fetch', () => ({
	default: vi.fn(),
}));

describe('npm metrics handlers', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('handleNpmTrends', () => {
		test('should return download trends', async () => {
			const mockFetchFn = mockFetch(mockNpmDownloadsData);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmTrends } = await import('../../index.js');
			const result = await handleNpmTrends({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://api.npmjs.org/downloads/point/last-month/test-package',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});
	});

	const npmsResponse = {
		analyzedAt: '2024-01-01',
		collected: {
			metadata: {
				name: 'test-package',
				version: '1.0.0',
			},
			npm: {
				downloads: [
					{
						from: '2024-01-01',
						to: '2024-01-31',
						count: 1000,
					},
				],
				starsCount: 100,
			},
		},
		score: {
			final: 0.8,
			detail: {
				quality: 0.9,
				popularity: 0.7,
				maintenance: 0.8,
			},
		},
	};

	describe('handleNpmQuality', () => {
		test('should return quality metrics', async () => {
			const mockFetchFn = mockFetch(npmsResponse);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmQuality } = await import('../../index.js');
			const result = await handleNpmQuality({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://api.npms.io/v2/package/test-package',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});
	});

	describe('handleNpmMaintenance', () => {
		test('should return maintenance metrics', async () => {
			const mockFetchFn = mockFetch(npmsResponse);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmMaintenance } = await import('../../index.js');
			const result = await handleNpmMaintenance({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://api.npms.io/v2/package/test-package',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});
	});

	describe('handleNpmPopularity', () => {
		test('should return popularity metrics', async () => {
			const mockFetchFn = mockFetch(npmsResponse);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmPopularity } = await import('../../index.js');
			const result = await handleNpmPopularity({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://api.npms.io/v2/package/test-package',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});
	});
});
