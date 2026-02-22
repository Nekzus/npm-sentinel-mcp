import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	handleNpmLicenseCompatibility,
	handleNpmTypes,
	handleNpmVulnerabilities,
} from '../../index';
import { validateToolResponse } from '../utils/test-helpers';

vi.mock('node-fetch', () => {
	return {
		default: vi.fn().mockImplementation((url, config) => {
			// 1. Invalid Package
			if (url.includes('invalid-package-name')) {
				return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
			}

			// 2. NPM Registry Mocks
			if (url.includes('registry.npmjs.org')) {
				const mockRegistry: Record<string, any> = {
					// Express (Legacy test case)
					'express-legacy/latest': {
						name: 'express-legacy',
						version: '4.18.2',
						license: 'MIT',
						types: '@types/express',
						dependencies: {},
					},
					'express-legacy/4.18.2': {
						name: 'express-legacy',
						version: '4.18.2',
						license: 'MIT',
						types: '@types/express',
						dependencies: {},
					},
					'@types/express-legacy/latest': { name: '@types/express', version: '4.18.2' },
					'@types/express-legacy/4.18.2': { name: '@types/express', version: '4.18.2' },

					// React Ecosystem (New Features)
					'react/latest': { version: '19.0.0' },
					'react/19.0.0': { name: 'react', version: '19.0.0', dependencies: {} },
					'react-server-dom-webpack/19.0.0': {
						name: 'react-server-dom-webpack',
						version: '19.0.0',
						dependencies: {},
					},
					'react-server-dom-parcel/19.0.0': {
						name: 'react-server-dom-parcel',
						version: '19.0.0',
						dependencies: {},
					},
					'react-dom/19.0.0': { name: 'react-dom', version: '19.0.0', dependencies: {} },

					// Transitive Dependency Chain
					'transitive-root/latest': { version: '1.0.0' },
					'transitive-root/1.0.0': {
						name: 'transitive-root',
						version: '1.0.0',
						dependencies: { 'transitive-child': '1.0.0' },
					},
					'transitive-child/1.0.0': {
						name: 'transitive-child',
						version: '1.0.0',
						dependencies: {},
					},

					// Misc Checks
					'vulnerable-pkg-enriched/latest': { version: '1.0.0' },
					'vulnerable-pkg-enriched/1.0.0': {
						name: 'vulnerable-pkg-enriched',
						version: '1.0.0',
						dependencies: {},
					},
					'safe-pkg/latest': { version: '1.0.0' },
					'safe-pkg/1.0.0': { name: 'safe-pkg', version: '1.0.0', dependencies: {} },
					'no-types-pkg/latest': {
						name: 'no-types-pkg',
						version: '1.0.0',
						description: 'Package without types',
						license: 'ISC',
					},
					'different-license-pkg': {
						name: 'different-license-pkg',
						version: '1.0.0',
						license: 'GPL-3.0',
					},
					'no-license-pkg': { name: 'no-license-pkg', version: '1.0.0' },
				};

				// Simple router
				for (const [key, val] of Object.entries(mockRegistry)) {
					// Check exact match for latest queries first
					if (url.endsWith(`/${key}`)) {
						return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
					}
				}
				// Fallback generic matching
				if (url.includes('different-license-pkg'))
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve(mockRegistry['different-license-pkg']),
					});
				if (url.includes('no-license-pkg'))
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve(mockRegistry['no-license-pkg']),
					});

				return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
			}

			// 3. OSV Batch Query API
			if (url.includes('api.osv.dev/v1/querybatch')) {
				const body = JSON.parse(config?.body as string);
				const results = body.queries.map((q: any) => {
					const pkg = q.package.name;

					// React Ecosystem
					if (pkg === 'react') return { vulns: [] }; // React core safe
					if (pkg === 'react-server-dom-webpack') {
						return { vulns: [{ id: 'GHSA-fv66-9v8q-g76r', modified: '2025-01-01' }] };
					}

					// Transitive
					if (pkg === 'transitive-child') {
						return { vulns: [{ id: 'GHSA-transitive', modified: '2025-01-01' }] };
					}

					// Generic Vulnerable
					if (pkg === 'vulnerable-pkg-enriched') {
						return {
							vulns: [
								{ id: 'GHSA-5678', severity: { type: 'HIGH' } },
								{ id: 'GHSA-9012', severity: { type: 'MODERATE' } },
							],
						};
					}

					// Express (Legacy)
					if (pkg === 'express-legacy') {
						return { vulns: [{ id: 'GHSA-fv66-9v8q-g76r', severity: { type: 'CRITICAL' } }] };
					}

					return { vulns: [] };
				});

				return Promise.resolve({ ok: true, json: () => Promise.resolve({ results }) });
			}

			// 4. OSV Enrichment API (GET /vulns/{id})
			if (url.includes('api.osv.dev/v1/vulns/')) {
				const id = url.split('/').pop();

				if (id === 'GHSA-fv66-9v8q-g76r') {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								id: 'GHSA-fv66-9v8q-g76r',
								summary: 'React2Shell RCE Vulnerability',
								aliases: ['CVE-2025-55182'],
								severity: { type: 'CRITICAL' },
							}),
					});
				}

				if (id === 'GHSA-transitive') {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								id: 'GHSA-transitive',
								summary: 'Deep vulnerability',
								aliases: ['CVE-TRANSITIVE-1'],
								severity: { type: 'HIGH' },
							}),
					});
				}

				// Fallback generic enrichment
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							id: id,
							summary: `Enriched summary for ${id}`,
							aliases: [`CVE-${id}`],
							severity: { type: 'UNKNOWN' },
						}),
				});
			}

			// 5. Deps.dev API
			if (url.includes('api.deps.dev/v3/systems/npm/packages/')) {
				if (url.includes('transitive-root')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve({
							nodes: [
								{ versionKey: { name: 'transitive-root', version: '1.0.0' } },
								{ versionKey: { name: 'transitive-child', version: '1.0.0' } }
							]
						})
					});
				}
				// Default empty nodes for others
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ nodes: [] })
				});
			}

			return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
		}),
	};
});

describe('npm security handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handleNpmVulnerabilities - New Features', () => {
		test('should resolve "latest" and scan ecosystem packages (React2Shell)', async () => {
			// Scanning react@latest -> resolves 19.0.0 -> triggers ecosystem check for react-server-dom-webpack@19.0.0
			const result = await handleNpmVulnerabilities({ packages: ['react'] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			// Checks
			// 1. React itself (secure)
			const reactRes = parsed.results.find((r: any) => r.package.startsWith('react'));
			expect(reactRes).toBeDefined();
			expect(reactRes.status).toBe('secure');

			// 2. Ecosystem check (vulnerable)
			const rsdwRes = parsed.results.find((r: any) =>
				r.package.includes('react-server-dom-webpack'),
			);
			expect(rsdwRes).toBeDefined();
			expect(rsdwRes.status).toBe('vulnerable');
			expect(rsdwRes.vulnerabilities[0].aliases).toContain('CVE-2025-55182'); // Enrichment check
			expect(rsdwRes.vulnerabilities[0].summary).toBe('React2Shell RCE Vulnerability'); // Enrichment check
		});

		test('should recursively scan transitive dependencies', async () => {
			// Scanning transitive-root -> finds transitive-child
			const result = await handleNpmVulnerabilities({ packages: ['transitive-root'] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			const rootRes = parsed.results.find((r: any) => r.package.includes('transitive-root'));
			const childRes = parsed.results.find((r: any) => r.package.includes('transitive-child'));

			expect(rootRes).toBeDefined();
			expect(childRes).toBeDefined();
			expect(childRes.isDependency).toBe(true);
			expect(childRes.status).toBe('vulnerable');
			expect(childRes.vulnerabilities[0].summary).toBe('Deep vulnerability');
		});

		test('should enrich vulnerability details (CVEs and Summaries)', async () => {
			const result = await handleNpmVulnerabilities({ packages: ['vulnerable-pkg-enriched'] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);

			const vuln = parsed.results[0].vulnerabilities[0];
			expect(vuln.summary).toContain('Enriched summary');
			expect(vuln.aliases[0]).toContain('CVE-');
		});
	});

	// Legacy Tests maintained for regression check
	describe('handleNpmVulnerabilities - Regression', () => {
		test('should return vulnerability information for a valid package', async () => {
			const result = await handleNpmVulnerabilities({ packages: ['express-legacy'] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);
			expect(parsed.results[0].package).toContain('express-legacy');
			expect(parsed.results[0].status).toBe('vulnerable');
			expect(parsed.results[0].vulnerabilities[0].summary).toContain(
				'React2Shell RCE Vulnerability',
			);
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmVulnerabilities({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);
			expect(parsed.results[0].package).toBe('invalid-package-name');
			expect(parsed.results[0].status).toBe('secure');
		});

		test('should handle empty package list', async () => {
			const result = await handleNpmVulnerabilities({ packages: [] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);
			expect(parsed.error).toContain('No package names provided');
		});
	});

	describe('handleNpmLicenseCompatibility', () => {
		test('should return license compatibility information', async () => {
			const result = await handleNpmLicenseCompatibility({ packages: ['express-legacy'] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);
			expect(parsed.results[0].data.license).toBe('MIT');
		});
	});

	describe('handleNpmTypes', () => {
		test('should return type information', async () => {
			const result = await handleNpmTypes({ packages: ['express-legacy'] });
			validateToolResponse(result);
			const parsed = JSON.parse((result.content[0] as any).text as string);
			expect(parsed.results[0].status).toBe('success');
		});
	});
});
