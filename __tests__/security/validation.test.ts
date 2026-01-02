import { describe, expect, test } from 'vitest';
import { 
    handleNpmVersions, 
    handleNpmLatest, 
    handleNpmDeps,
    handleNpmSize,
    handleNpmVulnerabilities,
    handleNpmTrends,
    handleNpmCompare,
    handleNpmQuality,
    handleNpmMaintenance,
    handleNpmMaintainers,
    handleNpmScore,
    handleNpmPackageReadme,
    handleNpmLicenseCompatibility,
    handleNpmRepoStats,
    handleNpmDeprecated,
    handleNpmChangelogAnalysis,
    handleNpmAlternatives
} from '../../index';

describe('Security: Input Validation', () => {
    const invalidInputs = [
        '../package',
        '../../etc/passwd', 
        '; ls -la',
        'package with spaces',
        '_underscoreStart',
        '.dotStart',
        'InvalidCapitals'
    ];

    const runTest = async (handler: (args: any) => Promise<any>, args: any) => {
        const result = await handler(args);
        
        // Some handlers might return isError: true for validation errors, others might return isError: false with error status in content
        // But checking the content status is the robust way as per implementation
        const content = result.content[0];
        if (content.type !== 'text') {
            throw new Error('Expected text content');
        }
        
        const parsed = JSON.parse(content.text);
        // Handlers return { results: [...] } structure
        if (parsed.results) {
             const item = parsed.results[0];
             // Expect status to be error or similar indication
             // Most implementations set status: 'error' and error: 'Invalid package name format'
             // Or at least contain the error message
             if (item.status === 'error') {
                 expect(item.error).toMatch(/Invalid package name|package name.*invalid/i);
             } else {
                 // Fail if status is not error (e.g. if it tried to fetch)
                 throw new Error(`Expected status 'error' but got '${item.status}' for input '${args.packages[0] || args.package}'`);
             }
        } else {
             // Some handlers might behave differently if I missed standardizing response?
             // But all should return { results: [] } or similar.
             // deprecated returns { results: [] }
             throw new Error('Unexpected response format');
        }
    };

    const handlersToTest = [
        { name: 'handleNpmVersions', fn: handleNpmVersions },
        { name: 'handleNpmLatest', fn: handleNpmLatest },
        { name: 'handleNpmDeps', fn: handleNpmDeps },
        { name: 'handleNpmSize', fn: handleNpmSize },
        { name: 'handleNpmVulnerabilities', fn: handleNpmVulnerabilities },
        { name: 'handleNpmCompare', fn: handleNpmCompare },
        { name: 'handleNpmQuality', fn: handleNpmQuality },
        { name: 'handleNpmMaintenance', fn: handleNpmMaintenance },
        { name: 'handleNpmMaintainers', fn: handleNpmMaintainers },
        { name: 'handleNpmScore', fn: handleNpmScore },
        { name: 'handleNpmPackageReadme', fn: handleNpmPackageReadme },
        { name: 'handleNpmLicenseCompatibility', fn: handleNpmLicenseCompatibility },
        { name: 'handleNpmRepoStats', fn: handleNpmRepoStats },
        { name: 'handleNpmDeprecated', fn: handleNpmDeprecated },
        { name: 'handleNpmChangelogAnalysis', fn: handleNpmChangelogAnalysis },
        { name: 'handleNpmAlternatives', fn: handleNpmAlternatives },
    ];

    for (const { name, fn } of handlersToTest) {
        describe(name, () => {
             test.each(invalidInputs)('should reject invalid package name: %s', async (input) => {
                await runTest(fn, { packages: [input] });
            });
        });
    }

    // Special case for handleNpmTrends with period arg (though optional, good to pass)
    describe('handleNpmTrends', () => {
         test.each(invalidInputs)('should reject invalid package name: %s', async (input) => {
            // Trend handler also takes period
            const result = await handleNpmTrends({ packages: [input], period: 'last-month' });
            const content = result.content[0];
            if (content.type !== 'text') {
                throw new Error('Expected text content');
            }
            const parsed = JSON.parse(content.text);
            expect(parsed.results[0].status).toBe('error');
            expect(parsed.results[0].error).toMatch(/Invalid package name|package name.*invalid/i);
        });
    });

});
