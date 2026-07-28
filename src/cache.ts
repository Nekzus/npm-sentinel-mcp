import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const CACHE_TTL_MEDIUM = 60 * 60 * 1000; // 1 hour
export const CACHE_TTL_LONG = 6 * 60 * 60 * 1000; // 6 hours
export const CACHE_TTL_VERY_LONG = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_CACHE_SIZE = 500; // Max number of items in cache

export interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

export const apiCache = new Map<string, CacheEntry<any>>();
let currentLockfileHash: string | null = null;

export function getLockfileHash(): string | null {
	const lockfiles = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'];
	for (const lockfile of lockfiles) {
		const fullPath = path.join(process.cwd(), lockfile);
		if (fs.existsSync(fullPath)) {
			try {
				const content = fs.readFileSync(fullPath);
				return crypto.createHash('md5').update(content).digest('hex');
			} catch (e) {
				console.error(`Error reading lockfile ${lockfile}:`, e);
			}
		}
	}
	return null;
}

currentLockfileHash = getLockfileHash();

export function checkCacheInvalidation(): void {
	const newHash = getLockfileHash();
	if (newHash !== currentLockfileHash) {
		console.error('[Cache] Lockfile changed, invalidating all cache entries.');
		apiCache.clear();
		currentLockfileHash = newHash;
	}
}

export function generateCacheKey(
	toolName: string,
	...args: (string | number | boolean | undefined | null)[]
): string {
	return `${toolName}:${args.map((arg) => String(arg)).join(':')}`;
}

export function cacheGet<T>(key: string): T | undefined {
	checkCacheInvalidation();
	const entry = apiCache.get(key);
	if (entry && entry.expiresAt > Date.now()) {
		return entry.data as T;
	}
	if (entry && entry.expiresAt <= Date.now()) {
		apiCache.delete(key);
	}
	return undefined;
}

export function cacheSet<T>(key: string, value: T, ttlMilliseconds: number): void {
	if (ttlMilliseconds <= 0) return;

	const expiresAt = Date.now() + ttlMilliseconds;
	apiCache.set(key, { data: value, expiresAt });

	if (apiCache.size > MAX_CACHE_SIZE) {
		const oldestKey = apiCache.keys().next().value;
		if (oldestKey) {
			apiCache.delete(oldestKey);
		}
	}
}

export const cacheManager = {
	get: cacheGet,
	set: cacheSet,
	clear: () => apiCache.clear(),
	generateKey: generateCacheKey,
	size: () => apiCache.size,
};
