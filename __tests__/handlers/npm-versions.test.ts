import fetch from 'node-fetch';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	mockErrorFetch,
	mockFetch,
	mockNpmPackageInfo,
	validateToolResponse,
} from '../utils/test-helpers.js';

vi.mock('node-fetch', () => ({
	default: vi.fn(),
}));

describe('npm version handlers', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('handleNpmVersions', () => {
		test('should return versions for a valid package', async () => {
			const mockFetchFn = mockFetch(mockNpmPackageInfo);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmVersions } = await import('../../index.js');
			const result = await handleNpmVersions({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://registry.npmjs.org/test-package',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});

		test('should handle errors gracefully', async () => {
			const mockFetchFn = mockErrorFetch();
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmVersions } = await import('../../index.js');
			const result = await handleNpmVersions({ packages: ['invalid-package'] });

			validateToolResponse(result);
			expect(result.content[0].text).toContain('Failed to fetch');
		});
	});

	describe('handleNpmLatest', () => {
		test('should return latest version info for a valid package', async () => {
			const mockFetchFn = mockFetch(mockNpmPackageInfo);
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmLatest } = await import('../../index.js');
			const result = await handleNpmLatest({ packages: ['test-package'] });

			validateToolResponse(result);
			expect(mockFetchFn).toHaveBeenCalledWith(
				'https://registry.npmjs.org/test-package/latest',
				expect.objectContaining({
					headers: expect.any(Object),
				}),
			);
		});

		test('should handle errors gracefully', async () => {
			const mockFetchFn = mockErrorFetch();
			(fetch as any).mockImplementation(mockFetchFn);

			const { handleNpmLatest } = await import('../../index.js');
			const result = await handleNpmLatest({ packages: ['invalid-package'] });

			validateToolResponse(result);
			expect(result.content[0].text).toContain('Failed to fetch');
		});
	});
});
