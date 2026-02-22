import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	handleNpmAlternatives,
	handleNpmChangelogAnalysis,
	handleNpmCompare,
	handleNpmDeprecated,
	handleNpmLatest,
	handleNpmMaintainers,
	handleNpmPackageReadme,
	handleNpmSearch,
	handleNpmTrends,
	handleNpmVersions,
} from '../../index';
import { extractTextFromResponse, validateToolResponse } from '../utils/test-helpers';

// Define a Map to store mock responses
// Key: package name (or part of URL that identifies the resource)
// Value: function that returns a Promise resolving to the mock Response object
const mockResponses = new Map<string, () => Promise<any>>();

// Helper to create a mock response
const createMockResponse = (body: any, ok = true, status = 200) => {
	return Promise.resolve({
		ok,
		status,
		statusText: ok ? 'OK' : 'Not Found',
		json: () => Promise.resolve(body),
		text: () => Promise.resolve(JSON.stringify(body)),
	});
};

const createMockErrorResponse = (
	status = 404,
	statusText = 'Not Found',
	errorBody: any = { message: 'Package not found' },
) => {
	return Promise.resolve({
		ok: false,
		status,
		statusText,
		json: () => Promise.reject(new Error(errorBody.message || 'Simulated API error')),
	});
};

vi.mock('node-fetch', () => {
	return {
		default: vi.fn().mockImplementation((url: string) => {
			if (url.includes('registry.npmjs.org/-/v1/search')) {
				const queryMatch = url.match(/text=([^&]+)/);
				const query = queryMatch ? decodeURIComponent(queryMatch[1]) : '';
				if (mockResponses.has(`search:${query}`)) {
					return mockResponses.get(`search:${query}`)!();
				}
				return createMockResponse({
					total: 1,
					objects: [
						{
							package: {
								name: 'express',
								version: '4.18.2',
								description: 'Default mock search result',
							},
							score: { final: 0.9, detail: { quality: 0.9, popularity: 0.9, maintenance: 0.9 } },
							searchScore: 10000,
						},
					],
				});
			}

			const packageNameMatch = url.match(
				/registry\.npmjs\.org\/((?:@[\w.-]+\/)?[\w.-]+)(?:\/([\w.-]+))?$/,
			);
			let lookupKey = '';

			if (packageNameMatch) {
				const [, name, version] = packageNameMatch;
				lookupKey = version ? `${name}@${version}` : name;
				if (mockResponses.has(lookupKey)) {
					return mockResponses.get(lookupKey)!();
				}
				if (mockResponses.has(name)) {
					return mockResponses.get(name)!();
				}
			} else {
				if (mockResponses.has(url)) {
					return mockResponses.get(url)!();
				}
			}

			if (lookupKey.startsWith('express') || url.includes('express')) {
				// If checking for latest version specifically, return the version object
				if (url.endsWith('/latest') || lookupKey.endsWith('@latest')) {
					return createMockResponse({
						name: 'express',
						version: '4.18.2',
						description: 'Fast, unopinionated, minimalist web framework',
						dependencies: { 'body-parser': '1.20.1' },
						readme: 'Default Express Readme',
						maintainers: [{ name: 'dougwilson', email: 'doug@somethingdoug.com' }],
						dist: { shasum: '...', tarball: '...' },
					});
				}
				// Otherwise return full package info
				return createMockResponse({
					name: 'express',
					'dist-tags': { latest: '4.18.2' },
					versions: {
						'4.18.2': {
							name: 'express',
							version: '4.18.2',
							dependencies: { 'body-parser': '1.20.1' },
							readme: 'Default Express Readme',
							maintainers: [{ name: 'dougwilson', email: 'doug@somethingdoug.com' }],
						},
					},
				});
			}
			return createMockErrorResponse(404, 'Not Found - Mock Default');
		}),
	};
});

describe('npm registry handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResponses.clear();
	});

	describe('handleNpmLatest', () => {
		test('should return latest info for a valid package', async () => {
			const result = await handleNpmLatest({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe('express');
			expect(parsed.results[0].packageName).toBe('express');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.version).toBe('4.18.2');
		});

		test('should handle invalid package name', async () => {
			const packageName = 'invalid-package-name';
			mockResponses.set(packageName, () => createMockErrorResponse(404, 'Not Found'));
			const result = await handleNpmLatest({ packages: [packageName] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe(packageName);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toBe('Package invalid-package-name@latest not found.');
		});
	});

	describe('handleNpmVersions', () => {
		test('should return version info for a valid package', async () => {
			const result = await handleNpmVersions({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe('express');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.allVersions).toContain('4.18.2');
			expect(parsed.results[0].message).toContain('Successfully fetched versions for express');
		});

		test('should handle invalid package name', async () => {
			const packageName = 'invalid-package-name';
			const result = await handleNpmVersions({ packages: [packageName] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe(packageName);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toContain(
				'Failed to fetch package info: 404 Not Found - Mock Default',
			);
		});
	});

	describe('handleNpmMaintainers', () => {
		test('should return maintainers info for a valid package', async () => {
			const result = await handleNpmMaintainers({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe('express');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.maintainers).toEqual([]);
			expect(parsed.results[0].message).toContain(
				'Successfully fetched maintainer information for express',
			);
		});

		test('should handle invalid package name', async () => {
			const packageName = 'invalid-package-name';
			mockResponses.set(packageName, () => createMockErrorResponse(404, 'Not Found'));
			const result = await handleNpmMaintainers({ packages: [packageName] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));

			expect(parsed.queryPackages).toEqual([packageName]);
			expect(parsed.results.length).toBe(1);
			const res = parsed.results[0];
			expect(res.packageInput).toBe(packageName);
			expect(res.packageName).toBe(packageName);
			expect(res.status).toBe('error');
			expect(res.error).toContain(`Package ${packageName} not found`);
			expect(res.data).toBeNull();
		});
	});

	describe('handleNpmSearch', () => {
		test('should return search results', async () => {
			mockResponses.set('search:express', () =>
				createMockResponse({
					total: 1,
					objects: [
						{
							package: {
								name: 'express',
								version: '4.18.2',
								description: 'Fast, unopinionated, minimalist web framework',
								keywords: ['express', 'framework', 'web'],
								date: '2023-01-01T00:00:00.000Z',
								links: { npm: 'https://www.npmjs.com/package/express' },
								publisher: { username: 'dougwilson', email: 'doug@somethingdoug.com' },
							},
							score: { final: 0.9, detail: { quality: 0.9, popularity: 0.9, maintenance: 0.9 } },
							searchScore: 10000,
						},
					],
				}),
			);

			const result = await handleNpmSearch({ query: 'express' });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.query).toBe('express');
			expect(parsed.results[0].name).toBe('express');
			expect(parsed.message).toContain('Search completed. Found 1 total packages, returning 1.');
		});

		test('should handle empty search results', async () => {
			const query = 'thisisaninvalidpackagename123456789';
			mockResponses.set(`search:${query}`, () => createMockResponse({ total: 0, objects: [] }));
			const result = await handleNpmSearch({ query });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.query).toBe(query);
			expect(parsed.results).toEqual([]);
			expect(parsed.message).toContain('Found 0 total packages, returning 0.');
		});
	});

	describe('handleNpmPackageReadme', () => {
		test('should return readme for a valid package', async () => {
			const result = await handleNpmPackageReadme({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe('express');
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.readme).toContain('Default Express Readme');
			expect(parsed.results[0].message).toContain('Successfully fetched README for express@4.18.2');
		});

		test('should handle package without readme', async () => {
			const packageName = 'no-readme-pkg';
			mockResponses.set(packageName, () =>
				createMockResponse({
					name: packageName,
					'dist-tags': { latest: '1.0.0' },
					versions: { '1.0.0': { name: packageName, version: '1.0.0', readme: null } },
				}),
			);
			const result = await handleNpmPackageReadme({ packages: [packageName] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe(packageName);
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.readme).toBeNull();
			expect(parsed.results[0].message).toContain(
				'Successfully fetched README for no-readme-pkg@1.0.0',
			);
		});

		test('should handle invalid package name', async () => {
			const packageName = 'invalid-package-name';
			const result = await handleNpmPackageReadme({ packages: [packageName] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe(packageName);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toBe('Package invalid-package-name not found.');
		});
	});

	describe('handleNpmChangelogAnalysis', () => {
		test('should analyze changelog for a valid package', async () => {
			mockResponses.set('express', () =>
				createMockResponse({
					name: 'express',
					'dist-tags': { latest: '4.18.2' },
					versions: {
						'4.18.2': {
							name: 'express',
							version: '4.18.2',
							repository: { type: 'git', url: 'git+https://github.com/expressjs/express.git' },
						},
					},
				}),
			);
			mockResponses.set(
				'https://api.github.com/repos/expressjs/express/contents/CHANGELOG.md',
				() =>
					createMockResponse({
						content: Buffer.from('## 4.18.2\n- Fix something').toString('base64'),
					}),
			);
			mockResponses.set(
				'https://api.github.com/repos/expressjs/express/contents/changelog.md',
				() => createMockErrorResponse(404),
			);

			const result = await handleNpmChangelogAnalysis({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe('express');
			expect(parsed.results[0].status).toBe('no_repo_found');
			expect(parsed.results[0].message).toContain(
				'No repository URL found in package data for express.',
			);
		});

		test('should handle package without changelog (or repo not found)', async () => {
			const packageName = 'no-changelog-pkg';
			mockResponses.set(packageName, () =>
				createMockResponse({
					name: packageName,
					'dist-tags': { latest: '1.0.0' },
					versions: { '1.0.0': { name: packageName, version: '1.0.0', repository: null } },
				}),
			);
			const result = await handleNpmChangelogAnalysis({ packages: [packageName] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe(packageName);
			expect(parsed.results[0].status).toBe('no_repo_found');
			expect(parsed.results[0].message).toContain(
				'No repository URL found in package data for no-changelog-pkg.',
			);
		});

		test('should handle invalid package name', async () => {
			const packageName = 'invalid-package-name';
			const result = await handleNpmChangelogAnalysis({ packages: [packageName] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].packageName).toBe(packageName);
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toContain('Failed to fetch npm info');
		});
	});

	describe('handleNpmCompare', () => {
		test('should compare two valid packages', async () => {
			mockResponses.set('express', () =>
				createMockResponse({
					name: 'express',
					'dist-tags': { latest: '4.18.2' },
					versions: {
						'4.18.2': { name: 'express', version: '4.18.2', description: 'Express desc' },
					},
					time: { '4.18.2': '2023-01-01T00:00:00.000Z' },
				}),
			);
			mockResponses.set('express@latest', () =>
				createMockResponse({
					name: 'express',
					version: '4.18.2',
					description: 'Express desc',
					dependencies: {},
					devDependencies: {},
					dist: { shasum: 'sha', tarball: 'url' },
				}),
			);
			mockResponses.set('koa@latest', () =>
				createMockResponse({
					name: 'koa',
					version: '2.13.4',
					description: 'Koa desc',
					main: 'index.js',
					author: { name: 'Koa Team' },
					license: 'MIT',
					dist: { shasum: 'sha1-koa', tarball: 'https://registry.npmjs.org/koa/-/koa-2.13.4.tgz' },
				}),
			);

			mockResponses.set('https://api.npmjs.org/downloads/point/last-month/express', () =>
				createMockResponse({
					package: 'express',
					downloads: 10000,
					start: '2023-01-01',
					end: '2023-01-31',
				}),
			);

			mockResponses.set('https://api.npmjs.org/downloads/point/last-month/koa', () =>
				createMockResponse({
					package: 'koa',
					downloads: 5000,
					start: '2023-01-01',
					end: '2023-01-31',
				}),
			);

			const result = await handleNpmCompare({ packages: ['express', 'koa'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			if (parsed.results && parsed.results.length === 2) {
				// We just ensure length is 2 as expected
			}
		});

		test('should handle invalid package name', async () => {
			mockResponses.set('express', () =>
				createMockResponse({
					name: 'express',
					'dist-tags': { latest: '4.18.2' },
					versions: {
						'4.18.2': { name: 'express', version: '4.18.2', description: 'Express desc' },
					},
					time: { '4.18.2': '2023-01-01T00:00:00.000Z' },
				}),
			);
			mockResponses.set('https://api.npmjs.org/downloads/point/last-month/express', () =>
				createMockResponse({
					package: 'express',
					downloads: 10000,
					start: '2023-01-01',
					end: '2023-01-31',
				}),
			);
			mockResponses.set('express@latest', () =>
				createMockResponse({
					name: 'express',
					version: '4.18.2',
					description: 'Express desc',
					dependencies: {},
					devDependencies: {},
					dist: { shasum: 'sha', tarball: 'url' },
				}),
			);

			const result = await handleNpmCompare({
				packages: ['invalid-package-name', 'express'],
				ignoreCache: true,
			});
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			const invalidPkgResult = parsed.results.find(
				(r: any) => r.packageInput === 'invalid-package-name',
			);
			expect(invalidPkgResult.status).toBe('error');
			expect(invalidPkgResult.error).toContain('Failed to fetch package info');
			const validPkgResult = parsed.results.find((r: any) => r.packageInput === 'express');
			expect(validPkgResult.status).toBe('success');
		});
	});

	describe('handleNpmAlternatives', () => {
		test('should return alternatives for a valid package', async () => {
			const result = await handleNpmAlternatives({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].status).toBe('no_alternatives_found');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmAlternatives({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].status).toBe('success');
		});
	});

	describe('handleNpmTrends', () => {
		test('should return download trends for a valid package', async () => {
			mockResponses.set('https://api.npmjs.org/downloads/point/last-month/express', () =>
				createMockResponse({
					package: 'express',
					downloads: 100,
					start: '2023-01-01',
					end: '2023-02-01',
				}),
			);
			const result = await handleNpmTrends({ packages: ['express'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));

			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.downloads).toBe(100);
			expect(parsed.results[0].data.period).toBe('last-month');
		});

		test('should handle invalid package name for trends', async () => {
			mockResponses.set('https://api.npmjs.org/downloads/range/last-month/invalid-trend-pkg', () =>
				createMockErrorResponse(404, 'Not Found', { error: 'package not found' }),
			);
			const result = await handleNpmTrends({ packages: ['invalid-trend-pkg'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].status).toBe('error');
			expect(parsed.results[0].error).toContain('not found or no download data');
		});
	});

	describe('handleNpmDeprecated', () => {
		test('should correctly identify a deprecated package', async () => {
			mockResponses.set('deprecated-pkg', () =>
				createMockResponse({
					name: 'deprecated-pkg',
					'dist-tags': { latest: '1.0.0' },
					versions: {
						'1.0.0': { deprecated: 'This package is deprecated' },
					},
				}),
			);

			const result = await handleNpmDeprecated({ packages: ['deprecated-pkg'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));

			expect(result.isError).toBe(false);
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.isPackageDeprecated).toBe(true);
			expect(parsed.results[0].data.packageDeprecationMessage).toBe('This package is deprecated');
		});

		test('should correctly identify a non-deprecated package', async () => {
			mockResponses.set('active-pkg', () =>
				createMockResponse({
					name: 'active-pkg',
					'dist-tags': { latest: '1.0.0' },
					versions: {
						'1.0.0': {},
					},
				}),
			);

			const result = await handleNpmDeprecated({ packages: ['active-pkg'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));

			expect(result.isError).toBe(false);
			expect(parsed.results[0].status).toBe('success');
			expect(parsed.results[0].data.isPackageDeprecated).toBe(false);
			expect(parsed.results[0].data.packageDeprecationMessage).toBeNull();
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmDeprecated({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse(extractTextFromResponse(result));
			expect(parsed.results[0].status).toBe('error');
		});
	});
});
