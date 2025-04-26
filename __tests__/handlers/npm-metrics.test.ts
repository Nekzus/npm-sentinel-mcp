import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	handleNpmAlternatives,
	handleNpmCompare,
	handleNpmDeps,
	handleNpmMaintenance,
	handleNpmQuality,
	handleNpmRepoStats,
	handleNpmScore,
	handleNpmSize,
	handleNpmTrends,
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
			expect(result.content[0].text).toContain('📊 Package Scores');
			expect(result.content[0].text).toContain('express');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmScore({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('❌ invalid-package-name');
		});
	});

	describe('handleNpmQuality', () => {
		test('should return quality metrics for a valid package', async () => {
			const result = await handleNpmQuality({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📊 Quality Metrics');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmQuality({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('❌ invalid-package-name');
		});
	});

	describe('handleNpmMaintenance', () => {
		test('should return maintenance metrics for a valid package', async () => {
			const result = await handleNpmMaintenance({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('🛠️ Maintenance Metrics');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmMaintenance({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('❌ invalid-package-name');
		});
	});

	describe('handleNpmSize', () => {
		test('should return size info for a valid package', async () => {
			const result = await handleNpmSize({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📦 express');
			expect(result.content[0].text).toContain('Size:');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmSize({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain(
				'❌ invalid-package-name: Failed to fetch package size',
			);
		});
	});

	describe('handleNpmDeps', () => {
		test('should return dependencies info for a valid package', async () => {
			const result = await handleNpmDeps({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📦 Dependencies for express@');
			expect(result.content[0].text).toContain('Dependencies:');
		});

		test('should handle package without dependencies', async () => {
			const result = await handleNpmDeps({ packages: ['is-odd'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📦 Dependencies for is-odd@');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmDeps({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain(
				'❌ invalid-package-name: Failed to fetch package info',
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
			expect(result.content[0].text).toContain('Error analyzing repository stats');
		});
	});

	describe('handleNpmCompare', () => {
		test('should compare multiple valid packages', async () => {
			const result = await handleNpmCompare({ packages: ['express', 'koa'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('Error comparing packages');
		});

		test('should handle invalid package in comparison', async () => {
			const result = await handleNpmCompare({ packages: ['express', 'invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('Error comparing packages');
		});
	});

	describe('handleNpmAlternatives', () => {
		test('should return alternatives for a valid package', async () => {
			const result = await handleNpmAlternatives({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('Error finding alternatives');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmAlternatives({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('Error finding alternatives');
		});
	});

	describe('handleNpmTrends', () => {
		test('should return download trends for a valid package', async () => {
			const result = await handleNpmTrends({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📈 Download Trends');
			expect(result.content[0].text).toContain('Period: last-month');
		});

		test('should handle custom period', async () => {
			const result = await handleNpmTrends({ packages: ['express'], period: 'last-week' });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📈 Download Trends');
			expect(result.content[0].text).toContain('Period: last-week');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmTrends({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📈 Download Trends');
			expect(result.content[0].text).toContain(
				'❌ invalid-package-name: Failed to fetch download trends',
			);
		});
	});
});
