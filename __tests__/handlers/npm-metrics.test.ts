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

			// Mock NPM downloads API
			if (url.includes('api.npmjs.org/downloads/point/last-month/')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							downloads: 1000000,
							start: '2024-01-01',
							end: '2024-01-31',
							package: 'express',
						}),
				});
			}

			// Mock GitHub API
			if (url.includes('api.github.com/repos/')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							stargazers_count: 50000,
							forks_count: 10000,
							subscribers_count: 2000,
							open_issues_count: 50,
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

			// Default response for valid packages from npm registry
			const match = url.match(/registry\.npmjs\.org\/(.+?)(\/|$)/);
			const pkgName = match ? match[1] : 'express';

			const isVersionRequest = url.includes('/latest') || url.match(/\/(\d+\.\d+\.\d+)$/);

			if (isVersionRequest) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							name: pkgName,
							version: '4.18.2',
							description: 'Fast, unopinionated, minimalist web framework',
							license: 'MIT',
							'dist-tags': { latest: '4.18.2' },
							dependencies: {
								accepts: '~1.3.8',
								'array-flatten': '1.1.1',
								'body-parser': '1.20.1',
							},
							maintainers: [{ name: 'dougwilson', email: 'doug@something.com' }],
							repository:
								pkgName === 'no-repo-pkg'
									? undefined
									: {
											type: 'git',
											url: `https://github.com/${pkgName}/${pkgName}.git`,
										},
						}),
				});
			}

			// Package Info Request (root packument)
			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						name: pkgName,
						'dist-tags': { latest: '4.18.2' },
						versions: {
							'4.18.2': {
								name: pkgName,
								version: '4.18.2',
								dist: { tarball: '...' },
								dependencies: {
									accepts: '~1.3.8',
									'array-flatten': '1.1.1',
									'body-parser': '1.20.1',
								},
								readme: '# Express\n\nFast, unopinionated, minimalist web framework for Node.js',
							},
						},
						time: {
							created: '2010-01-01T00:00:00.000Z',
							modified: '2023-01-01T00:00:00.000Z',
							'4.18.2': new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Hace 5 días
						},
						repository:
							pkgName === 'no-repo-pkg'
								? undefined
								: {
										type: 'git',
										url: `https://github.com/${pkgName}/${pkgName}.git`,
									},
					}),
			});
		}),
	};
});

describe('npm metrics handlers with Local Scoring', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handleNpmScore', () => {
		test('should return local score info for a valid package', async () => {
			const result = await handleNpmScore({ packages: ['express'], ignoreCache: true });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.queryPackages).toEqual(['express']);
			expect(parsed.results[0].packageInput).toBe('express');
			expect(parsed.results[0].status).toBe('success');

			// Verificar estructura de score local
			expect(parsed.results[0].data.score.final).toBeGreaterThan(0);
			expect(parsed.results[0].data.score.detail.quality).toBeGreaterThan(0);
			expect(parsed.results[0].data.score.detail.popularity).toBeGreaterThan(0);
			expect(parsed.results[0].data.score.detail.maintenance).toBeGreaterThan(0);
			expect(parsed.results[0].message).toContain('Successfully fetched score data for express');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmScore({
				packages: ['invalid-package-name'],
				ignoreCache: true,
			});
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.queryPackages).toEqual(['invalid-package-name']);
			expect(parsed.results[0].packageInput).toBe('invalid-package-name');
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toContain(
				'Package invalid-package-name not found on registry.',
			);
		});
	});

	describe('handleNpmQuality', () => {
		test('should return local quality metrics for a valid package', async () => {
			const result = await handleNpmQuality({ packages: ['express'], ignoreCache: true });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.queryPackages).toEqual(['express']);
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.qualityScore).toBeGreaterThan(0);
			expect(parsed.results[0].message).toContain('Successfully fetched quality score for express');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmQuality({
				packages: ['invalid-package-name'],
				ignoreCache: true,
			});
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.queryPackages).toEqual(['invalid-package-name']);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toContain(
				'Package invalid-package-name not found on registry.',
			);
		});
	});

	describe('handleNpmMaintenance', () => {
		test('should return local maintenance metrics for a valid package', async () => {
			const result = await handleNpmMaintenance({ packages: ['express'], ignoreCache: true });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.queryPackages).toEqual(['express']);
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.maintenanceScore).toBeGreaterThan(0);
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmMaintenance({
				packages: ['invalid-package-name'],
				ignoreCache: true,
			});
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.queryPackages).toEqual(['invalid-package-name']);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toContain(
				'Package invalid-package-name not found on registry.',
			);
		});
	});

	describe('handleNpmSize', () => {
		test('should return size info for a valid package', async () => {
			const result = await handleNpmSize({ packages: ['express'], ignoreCache: true });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.results[0].package).toBe('express');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.sizeInKb).toBe(48.83); // 50000 / 1024
			expect(parsed.results[0].data.gzipInKb).toBe(19.53); // 20000 / 1024
		});
	});

	describe('handleNpmDeps', () => {
		test('should return dependencies info for a valid package', async () => {
			const result = await handleNpmDeps({ packages: ['express'], ignoreCache: true });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.results[0].package).toBe('express@4.18.2');
			expect(parsed.results[0].status).toBe('success');
		});
	});

	describe('handleNpmRepoStats', () => {
		test('should return repository stats for a valid package', async () => {
			const result = await handleNpmRepoStats({ packages: ['express'], ignoreCache: true });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data).toHaveProperty('githubRepoUrl');
		});
	});
});
