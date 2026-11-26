import { beforeEach, describe, expect, test, vi } from 'vitest';
import { handleNpmChangelogAnalysis, handleNpmRepoStats } from '../../index';
import { extractTextFromResponse } from '../utils/test-helpers';

vi.mock('node-fetch');

describe('Security: GitHub Slug Validation (SSRF / Path Traversal)', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { default: fetch } = await import('node-fetch');
		fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
	});

	test('handleNpmRepoStats should reject path-traversal GitHub slugs without calling GitHub or deps.dev', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({
					name: 'malicious-repo-pkg',
					version: '1.0.0',
					repository: {
						type: 'git',
						url: 'https://github.com/../evil-repo.git',
					},
				}),
		});

		const result = await handleNpmRepoStats({
			packages: ['malicious-repo-pkg'],
			ignoreCache: true,
		});
		const parsed = JSON.parse(extractTextFromResponse(result));

		expect(parsed.results[0].status).toBe('not_github_repo');
		expect(parsed.results[0].message).toContain('invalid GitHub owner or repository characters');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]?.[0]).toContain('registry.npmjs.org');
	});

	test('handleNpmChangelogAnalysis should reject path-traversal GitHub slugs without calling GitHub', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({
					name: 'malicious-changelog-pkg',
					'dist-tags': { latest: '1.0.0' },
					repository: {
						type: 'git',
						url: 'https://github.com/../evil-repo.git',
					},
				}),
		});

		const result = await handleNpmChangelogAnalysis({
			packages: ['malicious-changelog-pkg'],
			ignoreCache: true,
		});
		const parsed = JSON.parse(extractTextFromResponse(result));

		expect(parsed.results[0].status).toBe('not_github_repo');
		expect(parsed.results[0].message).toContain('invalid GitHub owner or repository characters');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]?.[0]).toContain('registry.npmjs.org');
	});
});
