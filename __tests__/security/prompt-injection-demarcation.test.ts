import { describe, expect, test } from 'vitest';
import { handleNpmChangelogAnalysis, handleNpmPackageReadme } from '../../index.js';

describe('Security: Indirect Prompt Injection Demarcation (OWASP LLM01)', () => {
	describe('handleNpmPackageReadme', () => {
		test('should wrap README content in <untrusted_external_content> and include _meta flags', async () => {
			const result = await handleNpmPackageReadme({ packages: ['express'] });

			expect(result.isError).toBe(false);
			expect(result.content).toHaveLength(1);

			const textContent = result.content[0];
			if (textContent.type !== 'text') {
				throw new Error('Expected text content');
			}

			// Check _meta
			expect(textContent._meta).toBeDefined();
			expect(textContent._meta?.untrustedExternalContent).toBe(true);
			expect(textContent._meta?.sources).toEqual(
				expect.arrayContaining(['npm-registry', 'cdn']),
			);

			// Check parsed JSON payload
			const parsed = JSON.parse(textContent.text);
			expect(parsed.results).toHaveLength(1);
			const pkgResult = parsed.results[0];

			if (pkgResult.status === 'success' && pkgResult.data?.readme) {
				expect(pkgResult.data.readme).toContain('<untrusted_external_content');
				expect(pkgResult.data.readme).toContain('package="express"');
				expect(pkgResult.data.readme).toContain('type="readme"');
				expect(pkgResult.data.readme).toContain('</untrusted_external_content>');
			}
		});
	});

	describe('handleNpmChangelogAnalysis', () => {
		test(
			'should wrap changelog content in <untrusted_external_content> and include _meta flags',
			async () => {
				const result = await handleNpmChangelogAnalysis({ packages: ['express'] });

				expect(result.isError).toBe(false);
				expect(result.content).toHaveLength(1);

				const textContent = result.content[0];
				if (textContent.type !== 'text') {
					throw new Error('Expected text content');
				}

				// Check _meta
				expect(textContent._meta).toBeDefined();
				expect(textContent._meta?.untrustedExternalContent).toBe(true);
				expect(textContent._meta?.sources).toEqual(
					expect.arrayContaining(['github-releases', 'github-raw', 'npm-registry']),
				);

				// Check parsed JSON payload
				const parsed = JSON.parse(textContent.text);
				expect(parsed.results).toHaveLength(1);
				const pkgResult = parsed.results[0];

				if (pkgResult.status === 'success' && pkgResult.data?.changelogContent) {
					expect(pkgResult.data.changelogContent).toContain('<untrusted_external_content');
					expect(pkgResult.data.changelogContent).toContain('package="express"');
					expect(pkgResult.data.changelogContent).toContain('type="changelog"');
					expect(pkgResult.data.changelogContent).toContain('</untrusted_external_content>');
				}
			},
			20000,
		);
	});
});
