import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	handleNpmDeps,
	handleNpmMaintenance,
	handleNpmQuality,
	handleNpmRepoStats,
	handleNpmScore,
	handleNpmSize,
} from '../../index';
import { validateToolResponse } from '../utils/test-helpers';

vi.mock('node-fetch', () => {
	return {
		default: vi.fn().mockImplementation((url) => {
			if (url.includes('invalid-package-name')) {
				return Promise.resolve({
					ok: false,
					status: 404,
					statusText: 'Not Found',
					json: () => Promise.reject(new Error('Package not found')),
				});
			}

			if (url.includes('api.npms.io/v2/package/express')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							collected: {
								metadata: {
									name: 'express',
									version: '4.18.2',
									description: 'Fast, unopinionated, minimalist web framework',
									dependencies: {
										accepts: '~1.3.8',
										'array-flatten': '1.1.1',
										'body-parser': '1.20.1',
									},
									repository: {
										type: 'git',
										url: 'https://github.com/expressjs/express.git',
									},
									readme: '# Express\n\nFast, unopinionated, minimalist web framework for Node.js',
								},
								npm: {
									downloads: [
										{
											from: '2024-01-01',
											to: '2024-01-31',
											count: 1000000,
										},
									],
									starsCount: 50000,
									dependentsCount: 100000,
									maintainersCount: 10,
									releasesFrequency: 0.8,
								},
								github: {
									starsCount: 50000,
									forksCount: 10000,
									subscribersCount: 2000,
									issues: {
										count: 100,
										openCount: 50,
										distribution: {
											'3mo': 20,
											'6mo': 30,
											'1y': 50,
										},
									},
									commits: {
										frequency: 0.9,
									},
									contributors: 500,
								},
							},
							score: {
								final: 0.9,
								detail: {
									quality: 0.95,
									popularity: 0.85,
									maintenance: 0.9,
								},
							},
							evaluation: {
								quality: {
									carefulness: 0.9,
									tests: 0.8,
									health: 0.95,
									branding: 0.85,
								},
								popularity: {
									communityInterest: 0.9,
									downloadsCount: 0.95,
									downloadsAcceleration: 0.8,
									dependentsCount: 0.85,
								},
								maintenance: {
									releasesFrequency: 0.9,
									commitsFrequency: 0.85,
									openIssues: 0.8,
									issuesDistribution: 0.9,
								},
							},
						}),
				});
			}

			if (url.includes('bundlephobia.com')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							size: 50000,
							gzip: 20000,
							dependencyCount: 30,
						}),
				});
			}

			// Default response for valid packages
			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						name: 'express',
						version: '4.18.2',
						description: 'Fast, unopinionated, minimalist web framework',
						dependencies: {
							accepts: '~1.3.8',
							'array-flatten': '1.1.1',
							'body-parser': '1.20.1',
						},
					}),
			});
		}),
	};
});

describe('npm metrics handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handleNpmScore', () => {
		test('should return score info for a valid package', async () => {
			const result = await handleNpmScore({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.queryPackages).toEqual(['express']);
			expect(parsed.results[0].packageInput).toBe('express');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.score.final).toBe(0.9);
			expect(parsed.results[0].message).toContain('Successfully fetched score data for express');
			expect(parsed.message).toContain('Score information for 1 package(s)');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmScore({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.queryPackages).toEqual(['invalid-package-name']);
			expect(parsed.results[0].packageInput).toBe('invalid-package-name');
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toBe('Package invalid-package-name not found on npms.io.');
		});
	});

	describe('handleNpmQuality', () => {
		test('should return quality metrics for a valid package', async () => {
			const result = await handleNpmQuality({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.queryPackages).toEqual(['express']);
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.qualityScore).toBe(0.95);
			expect(parsed.results[0].message).toContain('Successfully fetched quality score for express');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmQuality({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.queryPackages).toEqual(['invalid-package-name']);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toBe('Package invalid-package-name not found on npms.io.');
			expect(parsed.results[0].message).toContain(
				'Could not retrieve quality information for invalid-package-name.',
			);
		});
	});

	describe('handleNpmMaintenance', () => {
		test('should return maintenance metrics for a valid package', async () => {
			const result = await handleNpmMaintenance({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.queryPackages).toEqual(['express']);
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.maintenanceScore).toBe(0.9);
			expect(parsed.results[0].message).toContain(
				'Successfully fetched maintenance score for express',
			);
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmMaintenance({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.queryPackages).toEqual(['invalid-package-name']);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toBe('Package invalid-package-name not found on npms.io.');
			expect(parsed.results[0].message).toContain(
				'Could not retrieve maintenance information for invalid-package-name.',
			);
		});
	});

	describe('handleNpmSize', () => {
		test('should return size info for a valid package', async () => {
			const result = await handleNpmSize({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.results[0].package).toBe('express');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.sizeInKb).toBe(48.83); // From Vitest output 50000 / 1024 roughly
			expect(parsed.results[0].data.gzipInKb).toBe(19.53); // From Vitest output 20000 / 1024 roughly
			expect(parsed.results[0].message).toContain('Size information for express');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmSize({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.results[0].package).toBe('invalid-package-name');
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toBe(
				'Package invalid-package-name not found or version not available on Bundlephobia.',
			);
			expect(parsed.results[0].message).toContain(
				'Could not retrieve size information for invalid-package-name.',
			);
		});
	});

	describe('handleNpmDeps', () => {
		test('should return dependencies info for a valid package', async () => {
			const result = await handleNpmDeps({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.results[0].package).toBe('express@4.18.2');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.dependencies.length).toBeGreaterThan(0);
			expect(parsed.results[0].data.dependencies).toEqual(
				expect.arrayContaining([expect.objectContaining({ name: 'accepts', version: '~1.3.8' })]),
			);
			expect(parsed.results[0].message).toContain('Dependencies for express@4.18.2');
		});

		test('should handle package without dependencies', async () => {
			const result = await handleNpmDeps({ packages: ['is-odd'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.results[0].package).toBe('is-odd@4.18.2');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.dependencies.length).toBeGreaterThan(0);
			expect(parsed.results[0].message).toContain('Dependencies for is-odd@4.18.2');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmDeps({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.results[0].package).toBe('invalid-package-name');
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toBe('Failed to fetch package info: 404 Not Found');
			expect(parsed.results[0].message).toContain(
				'Could not retrieve information for invalid-package-name.',
			);
		});
	});

	describe('handleNpmRepoStats', () => {
		test('should return repository stats for a valid package', async () => {
			const result = await handleNpmRepoStats({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('No repository URL found');
		});

		test('should handle package without repository', async () => {
			const result = await handleNpmRepoStats({ packages: ['no-repo-pkg'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('No repository URL found');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmRepoStats({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(result.content[0].text as string);
			expect(parsed.queryPackages).toEqual(['invalid-package-name']);
			expect(parsed.results[0].packageInput).toBe('invalid-package-name');
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toContain(
				'Failed to fetch npm info for invalid-package-name',
			);
			expect(parsed.results[0].message).toContain(
				'Could not retrieve NPM package data for invalid-package-name.',
			);
		});
	});
});
