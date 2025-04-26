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
			if (url.includes('invalid-package-name')) {
				return Promise.resolve({
					ok: false,
					status: 404,
					statusText: 'Not Found',
				});
			}

			if (url.includes('registry.npmjs.org')) {
				if (url.includes('express/latest')) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								name: 'express',
								version: '4.18.2',
								description: 'Fast, unopinionated, minimalist web framework',
								license: 'MIT',
								types: '@types/express',
							}),
					});
				}

				if (url.includes('no-types-pkg/latest')) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								name: 'no-types-pkg',
								version: '1.0.0',
								description: 'Package without types',
								license: 'ISC',
							}),
					});
				}

				if (url.includes('different-license-pkg/latest')) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								name: 'different-license-pkg',
								version: '1.0.0',
								description: 'Package with different license',
								license: 'GPL-3.0',
							}),
					});
				}

				if (url.includes('no-license-pkg/latest')) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								name: 'no-license-pkg',
								version: '1.0.0',
								description: 'Package without license',
							}),
					});
				}

				if (url.includes('@types/express/latest')) {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								name: '@types/express',
								version: '4.18.2',
							}),
					});
				}

				if (url.includes('@types/no-types-pkg/latest')) {
					return Promise.resolve({
						ok: false,
						status: 404,
						statusText: 'Not Found',
					});
				}
			}

			if (url.includes('api.osv.dev/v1/query')) {
				const body = JSON.parse(config?.body as string);
				const pkg = body.package.name;

				if (pkg === 'express') {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								vulns: [
									{
										id: '1234',
										summary: 'Critical vulnerability in express',
										details: 'This is a critical vulnerability',
										modified: '2023-01-01',
										published: '2023-01-01',
										database_specific: {
											severity: 'CRITICAL',
										},
										references: [
											{
												type: 'WEB',
												url: 'https://example.com/vuln/1234',
											},
										],
									},
								],
							}),
					});
				}

				if (pkg === 'vulnerable-pkg') {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								vulns: [
									{
										id: '5678',
										summary: 'High severity vulnerability',
										details: 'This is a high severity vulnerability',
										modified: '2023-01-01',
										published: '2023-01-01',
										database_specific: {
											severity: 'HIGH',
										},
										references: [
											{
												type: 'WEB',
												url: 'https://example.com/vuln/5678',
											},
										],
									},
									{
										id: '9012',
										summary: 'Moderate severity vulnerability',
										details: 'This is a moderate severity vulnerability',
										modified: '2023-01-01',
										published: '2023-01-01',
										database_specific: {
											severity: 'MODERATE',
										},
										references: [
											{
												type: 'WEB',
												url: 'https://example.com/vuln/9012',
											},
										],
									},
								],
							}),
					});
				}

				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ vulns: [] }),
				});
			}

			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({}),
			});
		}),
	};
});

describe('npm security handlers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handleNpmTypes', () => {
		test('should return type information for a valid package', async () => {
			const result = await handleNpmTypes({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📦 TypeScript support for express@4.18.2');
			expect(result.content[0].text).toContain('✅ Package includes built-in TypeScript types');
			expect(result.content[0].text).toContain('Types path: @types/express');
			expect(result.content[0].text).toContain(
				'📦 DefinitelyTyped package available: @types/express@4.18.2',
			);
			expect(result.content[0].text).toContain('Install with: npm install -D @types/express');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmTypes({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain(
				'Error checking TypeScript types: Failed to fetch package info: Not Found',
			);
		});
	});

	describe('handleNpmVulnerabilities', () => {
		test('should return vulnerability information for a valid package', async () => {
			const result = await handleNpmVulnerabilities({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('🔒 Security Analysis');
			expect(result.content[0].text).toContain('📦 express');
			expect(result.content[0].text).toContain('⚠️ Found 1 vulnerabilities:');
			expect(result.content[0].text).toContain('Critical vulnerability in express');
			expect(result.content[0].text).toContain('Severity: Unknown');
			expect(result.content[0].text).toContain('More info: https://example.com/vuln/1234');
		});

		test('should handle package with multiple vulnerabilities', async () => {
			const result = await handleNpmVulnerabilities({ packages: ['vulnerable-pkg'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('🔒 Security Analysis');
			expect(result.content[0].text).toContain('📦 vulnerable-pkg');
			expect(result.content[0].text).toContain('⚠️ Found 2 vulnerabilities:');
			expect(result.content[0].text).toContain('High severity vulnerability');
			expect(result.content[0].text).toContain('Moderate severity vulnerability');
			expect(result.content[0].text).toContain('More info: https://example.com/vuln/5678');
			expect(result.content[0].text).toContain('More info: https://example.com/vuln/9012');
		});

		test('should handle package with no vulnerabilities', async () => {
			const result = await handleNpmVulnerabilities({ packages: ['safe-pkg'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('🔒 Security Analysis');
			expect(result.content[0].text).toContain('📦 safe-pkg');
			expect(result.content[0].text).toContain('✅ No known vulnerabilities');
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmVulnerabilities({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('🔒 Security Analysis');
			expect(result.content[0].text).toContain('📦 invalid-package-name');
			expect(result.content[0].text).toContain('✅ No known vulnerabilities');
		});

		test('should handle empty package list', async () => {
			const result = await handleNpmVulnerabilities({ packages: [] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain(
				'Error checking vulnerabilities: No package names provided',
			);
		});
	});

	describe('handleNpmLicenseCompatibility', () => {
		test('should return license compatibility information for valid packages', async () => {
			const result = await handleNpmLicenseCompatibility({ packages: ['express'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📜 License Compatibility Analysis');
			expect(result.content[0].text).toContain('Packages analyzed:');
			expect(result.content[0].text).toContain('• express: MIT');
			expect(result.content[0].text).toContain('Compatibility Analysis:');
			expect(result.content[0].text).toContain('✅ All MIT licensed. Generally safe to use.');
		});

		test('should handle packages with different licenses', async () => {
			const result = await handleNpmLicenseCompatibility({
				packages: ['express', 'different-license-pkg'],
			});
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📜 License Compatibility Analysis');
			expect(result.content[0].text).toContain('Packages analyzed:');
			expect(result.content[0].text).toContain('• express: MIT');
			expect(result.content[0].text).toContain('• different-license-pkg: GPL-3.0');
			expect(result.content[0].text).toContain(
				'⚠️ Contains GPL licensed code. Resulting work may need to be GPL licensed.',
			);
			expect(result.content[0].text).toContain(
				'⚠️ Mixed GPL with MIT/Apache licenses. Review carefully for compliance.',
			);
		});

		test('should handle package without license', async () => {
			const result = await handleNpmLicenseCompatibility({
				packages: ['express', 'no-license-pkg'],
			});
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📜 License Compatibility Analysis');
			expect(result.content[0].text).toContain('Packages analyzed:');
			expect(result.content[0].text).toContain('• express: MIT');
			expect(result.content[0].text).toContain('• no-license-pkg: UNKNOWN');
			expect(result.content[0].text).toContain(
				'⚠️ Warning: Some packages have unknown licenses. Manual review recommended.',
			);
		});

		test('should handle invalid package name', async () => {
			const result = await handleNpmLicenseCompatibility({ packages: ['invalid-package-name'] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain(
				'Error analyzing license compatibility: Failed to fetch license info for invalid-package-name: Not Found',
			);
		});

		test('should handle empty package list', async () => {
			const result = await handleNpmLicenseCompatibility({ packages: [] });
			validateToolResponse(result);
			expect(result.content[0].text).toContain('📜 License Compatibility Analysis');
			expect(result.content[0].text).toContain('Packages analyzed:');
			expect(result.content[0].text).toContain('Compatibility Analysis:');
		});
	});
});
