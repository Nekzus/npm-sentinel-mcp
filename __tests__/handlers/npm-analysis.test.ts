import fetch from 'node-fetch';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	mockBundlephobiaData,
	mockFetch,
	mockNpmPackageInfo,
	validateToolResponse,
} from '../utils/test-helpers.js';

vi.mock('node-fetch', () => ({
	default: vi.fn(),
}));

describe('npm analysis handlers', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('handleNpmDeps', () => {
		test('should return dependencies for a valid package', async () => {
			const mockFetchFn = mockFetch(mockNpmPackageInfo);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmDeps } = await import('../../index.js');
			const result = await handleNpmDeps({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://registry.npmjs.org/test-package/latest',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});
	});

	describe('handleNpmSize', () => {
		test('should return size information for a valid package', async () => {
			const mockFetchFn = mockFetch(mockBundlephobiaData);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmSize } = await import('../../index.js');
			const result = await handleNpmSize({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://bundlephobia.com/api/size?package=test-package',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});
	});

	describe('handleNpmTypes', () => {
		test('should check TypeScript types availability', async () => {
			const mockFetchFn = mockFetch(mockNpmPackageInfo);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmTypes } = await import('../../index.js');
			const result = await handleNpmTypes({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://registry.npmjs.org/test-package/latest',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://registry.npmjs.org/@types/test-package/latest',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});
	});

	describe('handleNpmVulnerabilities', () => {
		test('should check for vulnerabilities', async () => {
			const mockFetchFn = mockFetch({ vulnerabilities: [] });
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmVulnerabilities } = await import('../../index.js');
			const result = await handleNpmVulnerabilities({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://api.osv.dev/v1/query',
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						package: {
							name: 'test-package',
							ecosystem: 'npm',
						},
					}),
				}),
			);
		});
	});
});
