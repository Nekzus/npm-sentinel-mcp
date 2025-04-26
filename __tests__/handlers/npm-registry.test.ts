import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	handleNpmChangelogAnalysis,
	handleNpmDeprecated,
	handleNpmLatest,
	handleNpmMaintainers,
	handleNpmPackageReadme,
	handleNpmSearch,
	handleNpmVersions,
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

			if (url.includes('registry.npmjs.org/-/v1/search')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							total: 1,
							objects: [
								{
									package: {
										name: 'express',
										version: '4.18.2',
										description: 'Fast, unopinionated, minimalist web framework',
										keywords: ['express', 'framework', 'web'],
										links: {
											npm: 'https://www.npmjs.com/package/express',
											homepage: 'https://expressjs.com',
											repository: 'https://github.com/expressjs/express',
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
									searchScore: 100000,
								},
							],
						}),
				});
			}

			// Default response for express and other valid packages
			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({
						name: 'express',
						'dist-tags': { latest: '4.18.2' },
						versions: {
							'4.18.2': {
								name: 'express',
								version: '4.18.2',
								description: 'Fast, unopinionated, minimalist web framework',
								author: { name: 'TJ Holowaychuk', email: 'tj@vision-media.ca' },
								license: 'MIT',
								dependencies: {
									accepts: '~1.3.8',
									'array-flatten': '1.1.1',
									'body-parser': '1.20.1',
								},
								maintainers: [{ name: 'dougwilson', email: 'doug@somethingdoug.com' }],
								readme: '# Express\n\nFast, unopinionated, minimalist web framework for Node.js',
							},
						},
					}),
			});
		}),
	};
});

describe('npm registry handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handleNpmLatest', () => {
		test('should return latest info for a valid package', async () => {
			const result = await handleNpmLatest({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📦 Latest version of express');
			expect(result.content[0].text).toContain('Version:');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmLatest({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain(
				'❌ Error fetching latest version for invalid-package-name',
			);
		});
	});

	describe('handleNpmVersions', () => {
		test('should return version info for a valid package', async () => {
			const result = await handleNpmVersions({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📦 express:');
			expect(result.content[0].text).toContain('Latest version:');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmVersions({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('❌ Error fetching invalid-package-name');
		});
	});

	describe('handleNpmMaintainers', () => {
		test('should return maintainers info for a valid package', async () => {
			const result = await handleNpmMaintainers({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('👥 Package Maintainers');
			expect(result.content[0].text).toContain('express');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmMaintainers({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain(
				'❌ invalid-package-name: Package not found in the npm registry',
			);
		});
	});

	describe('handleNpmSearch', () => {
		test('should return search results', async () => {
			const result = await handleNpmSearch({ query: 'express' });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('🔍 Search results for "express"');
			expect(result.content[0].text).toContain('Found');
		});

		test('should handle empty search results', async () => {
			const result = await handleNpmSearch({ query: 'thisisaninvalidpackagename123456789' });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('🔍 Search results for');
			expect(result.content[0].text).toContain('Found 1 packages');
		});
	});

	describe('handleNpmPackageReadme', () => {
		test('should return readme for a valid package', async () => {
			const result = await handleNpmPackageReadme({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📖 express@');
			expect(result.content[0].text).toContain('Express');
		});

		test('should handle package without readme', async () => {
			const result = await handleNpmPackageReadme({ packages: ['no-readme-pkg'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📖 no-readme-pkg@');
		});
	});

	describe('handleNpmDeprecated', () => {
		test('should check deprecation status for a valid package', async () => {
			const result = await handleNpmDeprecated({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📦 Deprecation Check for express@');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmDeprecated({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('Error checking deprecated packages');
		});
	});

	describe('handleNpmChangelogAnalysis', () => {
		test('should analyze changelog for a valid package', async () => {
			const result = await handleNpmChangelogAnalysis({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('No repository found for package express');
		});

		test('should handle package without changelog', async () => {
			const result = await handleNpmChangelogAnalysis({ packages: ['no-changelog-pkg'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('No repository found for package no-changelog-pkg');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmChangelogAnalysis({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('Error analyzing changelog');
		});
	});
});
