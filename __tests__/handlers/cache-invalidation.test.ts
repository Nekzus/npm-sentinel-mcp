
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { handleNpmVersions } from '../../index';
import { validateToolResponse } from '../utils/test-helpers';

// Mocks must be defined before imports
vi.mock('node:fs');
vi.mock('node-fetch');

// We don't necessarily need to mock crypto if we just want MD5, 
// but mocking it ensures we don't depend on actual hashing if we wanted to simplify.
// However, the real crypto works fine and is predictable.

describe('Cache Invalidation and ignoreCache', () => {
    let fetchMock: any;
    // We'll control what the "filesystem" returns
    let mockLockfileContent = 'initial-lockfile-content';
    let mockFileExists = true;
    let testId = 0;

    beforeEach(async () => {
        vi.clearAllMocks();
        
        // Ensure unique content for each test to force invalidation at start
        testId++;
        mockLockfileContent = `lockfile-content-test-${testId}`;
        mockFileExists = true;

        // Mock fs.existsSync
        vi.mocked(fs.existsSync).mockImplementation((path) => {
            const p = String(path);
            if (p.endsWith('pnpm-lock.yaml') || p.endsWith('package-lock.json') || p.endsWith('yarn.lock')) {
                return mockFileExists;
            }
            return false;
        });

        // Mock fs.readFileSync
        vi.mocked(fs.readFileSync).mockImplementation(() => {
            return Buffer.from(mockLockfileContent);
        });

        // Mock fetch
        const { default: fetch } = await import('node-fetch');
        fetchMock = fetch;
        fetchMock.mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    name: 'react',
                    'dist-tags': { latest: '18.2.0' },
                    versions: {
                        '18.2.0': { name: 'react', version: '18.2.0' }
                    }
                }),
                text: () => Promise.resolve('{"name":"react"}')
            });
        });
    });

    test('should cache results when ignoreCache is not used', async () => {
        // First call
        await handleNpmVersions({ packages: ['react'] });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Second call - should hit cache
        await handleNpmVersions({ packages: ['react'] });
        expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1
    });

    test('should bypass cache when ignoreCache is true', async () => {
        // First call
        await handleNpmVersions({ packages: ['react'] });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // Second call with ignoreCache: true
        await handleNpmVersions({ packages: ['react'], ignoreCache: true });
        expect(fetchMock).toHaveBeenCalledTimes(2); // Should increment
    });

    test('should invalidate cache when lockfile changes', async () => {
        // 1. Initial call - fetch (cache was invalidated by beforeEach change)
        await handleNpmVersions({ packages: ['react'] });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // 2. Second call - cache hit
        await handleNpmVersions({ packages: ['react'] });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // 3. Change lockfile content
        mockLockfileContent = `new-lockfile-content-${testId}`;
        
        // 4. Third call - should detect change, invalidate cache, and fetch again
        await handleNpmVersions({ packages: ['react'] });
        expect(fetchMock).toHaveBeenCalledTimes(2);

        // 5. Fourth call - should cache the new result
        await handleNpmVersions({ packages: ['react'] });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
