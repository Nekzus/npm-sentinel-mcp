import { describe, expect, test } from 'vitest';
import { handleNpmVersions, handleNpmLatest, handleNpmDeps } from '../../index';

describe('Security: Input Validation', () => {
    const invalidInputs = [
        '../package',
        '../../etc/passwd', 
        '; ls -la',
        'package with spaces',
        '_underscoreStart',
        '.dotStart',
        '@Scope/Package', // Invalid casing if strictly mostly lowercase, but regex allows mixed case for scope/name? Actually regex was: /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
        // The regex restricts to lowercase a-z. So 'Package' should fail.
        'InvalidCapitals'
    ];

    describe('handleNpmVersions', () => {
        test.each(invalidInputs)('should reject invalid package name: %s', async (input) => {
            const result = await handleNpmVersions({ packages: [input] });
            expect(result.isError).toBe(false); 
            
            const content = result.content[0];
            if (content.type !== 'text') {
                throw new Error('Expected text content');
            }
            
            const parsed = JSON.parse(content.text);
            expect(parsed.results[0].status).toBe('error');
            expect(parsed.results[0].error).toContain('Invalid package name');
        });
    });

    describe('handleNpmLatest', () => {
         test.each(invalidInputs)('should reject invalid package name: %s', async (input) => {
            const result = await handleNpmLatest({ packages: [input] });
            
            const content = result.content[0];
            if (content.type !== 'text') {
                throw new Error('Expected text content');
            }

            const parsed = JSON.parse(content.text);
            expect(parsed.results[0].status).toBe('error');
            expect(parsed.results[0].error).toContain('Invalid package name');
        });
    });

    describe('handleNpmDeps', () => {
         test.each(invalidInputs)('should reject invalid package name: %s', async (input) => {
            const result = await handleNpmDeps({ packages: [input] });
            
            const content = result.content[0];
            if (content.type !== 'text') {
                throw new Error('Expected text content');
            }

            const parsed = JSON.parse(content.text);
            expect(parsed.results[0].status).toBe('error');
            expect(parsed.results[0].error).toContain('Invalid package name');
        });     
    });
});
