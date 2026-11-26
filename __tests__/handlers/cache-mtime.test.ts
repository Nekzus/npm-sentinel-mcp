import * as fs from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cacheGet, cacheSet, checkCacheInvalidation } from '../../src/cache';

vi.mock('node:fs');

describe('Cache mtimeMs + size fast-path', () => {
	let mockMtimeMs = 1000;
	let mockSize = 100;
	let mockContent = 'lockfile-v1';

	beforeEach(() => {
		vi.clearAllMocks();
		mockMtimeMs = 1000;
		mockSize = 100;
		mockContent = 'lockfile-v1';

		vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('pnpm-lock.yaml'));
		vi.mocked(fs.statSync).mockImplementation(
			() => ({ mtimeMs: mockMtimeMs, size: mockSize }) as fs.Stats,
		);
		vi.mocked(fs.readFileSync).mockImplementation(() => Buffer.from(mockContent));
	});

	test('should avoid re-reading lockfile when mtimeMs and size are unchanged, and invalidate when they change', () => {
		checkCacheInvalidation();
		cacheSet('test:key', { ok: true }, 60_000);
		expect(vi.mocked(fs.readFileSync)).toHaveBeenCalledTimes(1);

		// Repeated cacheGet calls with unchanged mtimeMs & size should NOT call readFileSync
		expect(cacheGet('test:key')).toEqual({ ok: true });
		expect(cacheGet('test:key')).toEqual({ ok: true });
		expect(vi.mocked(fs.readFileSync)).toHaveBeenCalledTimes(1);

		// Changing mtimeMs + content should trigger readFileSync and invalidate cache
		mockMtimeMs = 2000;
		mockSize = 120;
		mockContent = 'lockfile-v2';

		expect(cacheGet('test:key')).toBeUndefined();
		expect(vi.mocked(fs.readFileSync)).toHaveBeenCalledTimes(2);
	});
});
