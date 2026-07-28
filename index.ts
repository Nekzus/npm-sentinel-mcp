#!/usr/bin/env node

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import fetch from 'node-fetch';
import { z } from 'zod';
import createServer from './src/server.js';
import { needsVersionResolution, resolvePackageVersion } from './src/utils/version-resolver.js';

// Cache configuration
export let NPM_REGISTRY_URL = (
	process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org'
).replace(/\/$/, '');

export function setNpmRegistryUrl(url: string): void {
	NPM_REGISTRY_URL = url.replace(/\/$/, '');
}

// Cache configuration
const CACHE_TTL_SHORT = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL_MEDIUM = 60 * 60 * 1000; // 1 hour
const CACHE_TTL_LONG = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_TTL_VERY_LONG = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500; // Max number of items in cache

async function resolveVersionIfShorthand(name: string, version: string): Promise<string> {
	if (!needsVersionResolution(version)) {
		return version;
	}
	const cacheKey = generateCacheKey('abbreviatedPackument', name);
	let packument = cacheGet<any>(cacheKey);
	if (!packument) {
		try {
			const res = await fetchWithRetry(`${NPM_REGISTRY_URL}/${encodeURIComponent(name)}`, {
				headers: { Accept: 'application/vnd.npm.install-v1+json' },
			});
			if (res.ok) {
				packument = await res.json();
				cacheSet(cacheKey, packument, CACHE_TTL_SHORT);
			}
		} catch {
			// Ignore error and fall back to original version
		}
	}
	if (packument) {
		const resolved = resolvePackageVersion(packument, version);
		if (resolved) return resolved;
	}
	return version;
}

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

const apiCache = new Map<string, CacheEntry<any>>();
let currentLockfileHash: string | null = null;

function getLockfileHash(): string | null {
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

// Initialize hash
currentLockfileHash = getLockfileHash();

function checkCacheInvalidation() {
	const newHash = getLockfileHash();
	if (newHash !== currentLockfileHash) {
		console.error('[Cache] Lockfile changed, invalidating all cache entries.');
		apiCache.clear();
		currentLockfileHash = newHash;
	}
}

function generateCacheKey(
	toolName: string,
	...args: (string | number | boolean | undefined | null)[]
): string {
	// Simple key generation, ensure consistent order and stringification of args
	return `${toolName}:${args.map((arg) => String(arg)).join(':')}`;
}

function cacheGet<T>(key: string): T | undefined {
	// Check for global invalidation first
	checkCacheInvalidation();

	const entry = apiCache.get(key);
	if (entry && entry.expiresAt > Date.now()) {
		return entry.data as T;
	}
	if (entry && entry.expiresAt <= Date.now()) {
		apiCache.delete(key); // Remove stale entry
	}
	return undefined;
}

function cacheSet<T>(key: string, value: T, ttlMilliseconds: number): void {
	if (ttlMilliseconds <= 0) return; // Do not cache if TTL is zero or negative

	const expiresAt = Date.now() + ttlMilliseconds;
	apiCache.set(key, { data: value, expiresAt });

	// Basic FIFO eviction strategy if cache exceeds max size
	if (apiCache.size > MAX_CACHE_SIZE) {
		// To make it FIFO, we need to ensure Map iteration order is insertion order (which it is)
		const oldestKey = apiCache.keys().next().value;
		if (oldestKey) {
			apiCache.delete(oldestKey);
		}
	}
}

// HTTP wrapper configuration
const HTTP_MAX_RETRIES = 3;
const HTTP_INITIAL_BACKOFF_MS = 1000;
const HTTP_MAX_CONCURRENT_REQUESTS = 5;
const DEFAULT_HEADERS = {
	Accept: 'application/json',
	'User-Agent': 'NPM-Sentinel-MCP/1.x',
};

// Semaphore for concurrency control
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

function acquireSlot(): Promise<void> {
	if (activeRequests < HTTP_MAX_CONCURRENT_REQUESTS) {
		activeRequests++;
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		requestQueue.push(() => {
			activeRequests++;
			resolve();
		});
	});
}

function releaseSlot(): void {
	activeRequests--;
	const next = requestQueue.shift();
	if (next) next();
}

export async function fetchWithRetry(
	url: string,
	options: any = {},
	config: { maxRetries?: number; skipThrottle?: boolean } = {},
): Promise<any> {
	const maxRetries = config.maxRetries ?? HTTP_MAX_RETRIES;
	const mergedHeaders = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
	const mergedOptions = { ...options, headers: mergedHeaders };

	if (!config.skipThrottle) {
		await acquireSlot();
	}

	try {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(url, mergedOptions);

				if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
					if (attempt < maxRetries) {
						const retryAfter = response.headers.get('retry-after');
						const waitMs = retryAfter
							? parseInt(retryAfter, 10) * 1000
							: HTTP_INITIAL_BACKOFF_MS * 2 ** attempt;
						await new Promise((resolve) => setTimeout(resolve, waitMs));
						continue;
					}
				}
				return response;
			} catch (err) {
				if (attempt < maxRetries) {
					const waitMs = HTTP_INITIAL_BACKOFF_MS * 2 ** attempt;
					await new Promise((resolve) => setTimeout(resolve, waitMs));
					continue;
				}
				throw err;
			}
		}
		// Fallback
		return await fetch(url, mergedOptions);
	} finally {
		if (!config.skipThrottle) {
			releaseSlot();
		}
	}
}

// Zod schemas for npm package data
export const NpmMaintainerSchema = z
	.object({
		name: z.string(),
		email: z.string().optional(),
		url: z.string().optional(),
	})
	.loose();

export const NpmPackageVersionSchema = z
	.object({
		name: z.string(),
		version: z.string(),
		description: z.string().optional(),
		author: z
			.union([
				z.string(),
				z
					.object({
						name: z.string().optional(),
						email: z.string().optional(),
						url: z.string().optional(),
					})
					.loose(),
			])
			.optional(),
		license: z.string().optional(),
		repository: z
			.object({
				type: z.string().optional(),
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		bugs: z
			.object({
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		homepage: z.string().optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
		devDependencies: z.record(z.string(), z.string()).optional(),
		peerDependencies: z.record(z.string(), z.string()).optional(),
		types: z.string().optional(),
		typings: z.string().optional(),
		dist: z
			.object({ shasum: z.string().optional(), tarball: z.string().optional() })
			.loose()
			.optional(),
	})
	.loose();

export const NpmPackageInfoSchema = z
	.object({
		name: z.string(),
		'dist-tags': z.record(z.string(), z.string()),
		versions: z.record(z.string(), NpmPackageVersionSchema),
		time: z.record(z.string(), z.string()).optional(),
		repository: z
			.object({
				type: z.string().optional(),
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		bugs: z
			.object({
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		homepage: z.string().optional(),
		maintainers: z.array(NpmMaintainerSchema).optional(),
	})
	.loose();

export const NpmPackageDataSchema = z
	.object({
		name: z.string(),
		version: z.string(),
		description: z.string().optional(),
		license: z.string().optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
		devDependencies: z.record(z.string(), z.string()).optional(),
		peerDependencies: z.record(z.string(), z.string()).optional(),
		types: z.string().optional(),
		typings: z.string().optional(),
	})
	.loose();

export const BundlephobiaDataSchema = z.object({
	size: z.number(),
	gzip: z.number(),
	dependencyCount: z.number(),
});

export const NpmDownloadsDataSchema = z.object({
	downloads: z.number(),
	start: z.string(),
	end: z.string(),
	package: z.string(),
});

// Schema for search results from npm registry v1 search api

export const NpmSearchResultSchema = z
	.object({
		objects: z.array(
			z.object({
				package: z.object({
					name: z.string(),
					version: z.string(),
					description: z.string().optional(),
					keywords: z.array(z.string()).optional(),
					publisher: z
						.object({
							username: z.string(),
							email: z.string().optional(),
						})
						.optional(),
					links: z
						.object({
							npm: z.string().optional(),
							homepage: z.string().optional(),
							repository: z.string().optional(),
							bugs: z.string().optional(),
						})
						.optional(),
					date: z.string().optional(),
				}),
				score: z.object({
					final: z.number(),
					detail: z.object({
						quality: z.number(),
						popularity: z.number(),
						maintenance: z.number(),
					}),
				}),
				searchScore: z.number(),
			}),
		),
		total: z.number(), // total is a sibling of objects
	})
	.loose();

// Type inference
export type NpmPackageInfo = z.infer<typeof NpmPackageInfoSchema>;
export type NpmPackageData = z.infer<typeof NpmPackageDataSchema>;
export type BundlephobiaData = z.infer<typeof BundlephobiaDataSchema>;
export type NpmDownloadsData = z.infer<typeof NpmDownloadsDataSchema>;

// Type guards for API responses
function isNpmPackageInfo(data: unknown): data is NpmPackageInfo {
	return (
		typeof data === 'object' &&
		data !== null &&
		(!('maintainers' in data) ||
			(Array.isArray((data as NpmPackageInfo).maintainers) &&
				((data as NpmPackageInfo).maintainers?.every(
					(m) =>
						typeof m === 'object' &&
						m !== null &&
						'name' in m &&
						'email' in m &&
						typeof m.name === 'string' &&
						typeof m.email === 'string',
				) ??
					true)))
	);
}

function isNpmPackageData(data: unknown): data is z.infer<typeof NpmPackageDataSchema> {
	try {
		// Use safeParse to get error details
		const result = NpmPackageDataSchema.safeParse(data);
		if (!result.success) {
			console.error(
				'isNpmPackageData validation failed:',
				JSON.stringify(result.error.issues, null, 2),
			);
		}
		return result.success;
	} catch (e) {
		console.error('isNpmPackageData threw exception:', e);
		return false;
	}
}

function isBundlephobiaData(data: unknown): data is z.infer<typeof BundlephobiaDataSchema> {
	try {
		return BundlephobiaDataSchema.parse(data) !== null;
	} catch {
		return false;
	}
}

function isNpmDownloadsData(data: unknown): data is z.infer<typeof NpmDownloadsDataSchema> {
	try {
		const result = NpmDownloadsDataSchema.safeParse(data);
		if (!result.success) {
			console.error(
				'isNpmDownloadsData validation failed:',
				JSON.stringify(result.error.issues, null, 2),
			);
		}
		return result.success;
	} catch {
		return false;
	}
}

// Helper for validating NPM package names
function isValidNpmPackageName(name: string): boolean {
	const npmPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
	return (
		npmPackageRegex.test(name) &&
		name.length <= 214 &&
		!name.startsWith('_') &&
		!name.startsWith('.')
	);
}

export function createEmptyArrayErrorResponse(toolName: string): CallToolResult {
	const errorResponse = JSON.stringify(
		{
			queryPackages: [],
			results: [],
			status: 'error',
			error: 'No package names provided in request',
			message: `The packages parameter for ${toolName} must contain at least one package name.`,
		},
		null,
		2,
	);
	return {
		content: [{ type: 'text', text: errorResponse }],
		isError: true,
	};
}

export async function handleNpmVersions(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			return createEmptyArrayErrorResponse('npmVersions');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error',
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error',
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
					};
				}

				const cacheKey = generateCacheKey('handleNpmVersions', name);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey); // Using any for the diverse structure from this endpoint

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success_cache',
						error: null,
						data: cachedData,
						message: `Successfully fetched versions for ${name} from cache.`,
					};
				}
				try {
					const response = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}`);

					if (!response.ok) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error',
							error: `Failed to fetch package info: ${response.status} ${response.statusText}`,
							data: null,
							message: `Could not retrieve information for package ${name}.`,
						};
					}

					const data = await response.json();
					if (!isNpmPackageInfo(data)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error',
							error: 'Invalid package info format received from registry',
							data: null,
							message: `Received malformed data for package ${name}.`,
						};
					}

					const allVersions = Object.keys(data.versions || {});
					const tags = data['dist-tags'] || {};
					const latestVersionTag = tags.latest || null;

					const resultData = {
						allVersions,
						tags,
						latestVersionTag,
					};

					cacheSet(cacheKey, resultData, CACHE_TTL_MEDIUM);

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success',
						error: null,
						data: resultData,
						message: `Successfully fetched versions for ${name}.`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error',
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing ${name}.`,
					};
				}
			}),
		);

		const responseJson = JSON.stringify({ results: processedResults }, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				results: [],
				error: `General error fetching versions: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmLatest(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			return createEmptyArrayErrorResponse('npmLatest');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let versionTag = 'latest'; // Default to 'latest'

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						versionTag = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						versionQueried: versionTag,
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						status: 'error',
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						versionQueried: versionTag,
						status: 'error',
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
					};
				}

				const cacheKey = generateCacheKey('handleNpmLatest', name, versionTag);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey); // Using any for the diverse structure from this endpoint

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						status: 'success_cache',
						error: null,
						data: cachedData,
						message: `Successfully fetched details for ${name}@${versionTag} from cache.`,
					};
				}

				try {
					const resolvedVersion = await resolveVersionIfShorthand(name, versionTag);
					const response = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}/${resolvedVersion}`);

					if (!response.ok) {
						let errorMsg = `Failed to fetch package version: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name}@${versionTag} not found.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionTag,
							status: 'error',
							error: errorMsg,
							data: null,
							message: `Could not retrieve version ${versionTag} for package ${name}.`,
						};
					}

					const data = await response.json();

					if (!isNpmPackageVersionData(data)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionTag,
							status: 'error',
							error: 'Invalid package data format received for version',
							data: null,
							message: `Received malformed data for ${name}@${versionTag}.`,
						};
					}

					const versionData = {
						name: data.name,
						version: data.version,
						description: data.description || null,
						author:
							(typeof data.author === 'string' ? data.author : (data.author as any)?.name) || null,
						license: data.license || null,
						homepage: data.homepage || null,
						repositoryUrl: data.repository?.url || null,
						bugsUrl: data.bugs?.url || null,
						dependenciesCount: Object.keys(data.dependencies || {}).length,
						devDependenciesCount: Object.keys(data.devDependencies || {}).length,
						peerDependenciesCount: Object.keys(data.peerDependencies || {}).length,
						dist: data.dist || null,
						types: data.types || data.typings || null,
					};

					cacheSet(cacheKey, versionData, CACHE_TTL_MEDIUM);

					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						status: 'success',
						error: null,
						data: versionData,
						message: `Successfully fetched details for ${data.name}@${data.version}.`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						status: 'error',
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing ${pkgInput}.`,
					};
				}
			}),
		);

		const responseJson = JSON.stringify({ results: processedResults }, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				results: [],
				error: `General error fetching latest package information: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmDeps(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let version = 'latest'; // Default to 'latest'

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						version = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						package: 'unknown_package_input',
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						package: pkgInput,
						status: 'error',
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				const packageNameForOutput = version === 'latest' ? name : `${name}@${version}`;

				// Note: The cache key should ideally use the *resolved* version if 'latest' is input.
				// However, to get the resolved version, we need an API call. For simplicity in this step,
				// we'll cache based on the input version string. This means 'latest' will be cached as 'latest'.
				// A more advanced caching would fetch resolved version first if 'latest' is given.
				const cacheKey = generateCacheKey('handleNpmDeps', name, version);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						package: cachedData.packageNameForCache || packageNameForOutput, // Use cached name if available
						status: 'success_cache',
						error: null,
						data: cachedData.depData,
						message: `Dependencies for ${cachedData.packageNameForCache || packageNameForOutput} from cache.`,
					};
				}

				try {
					const resolvedVersion = await resolveVersionIfShorthand(name, version);
					const response = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}/${resolvedVersion}`);

					if (!response.ok) {
						return {
							package: packageNameForOutput,
							status: 'error',
							error: `Failed to fetch package info: ${response.status} ${response.statusText}`,
							data: null,
							message: `Could not retrieve information for ${packageNameForOutput}.`,
						};
					}

					const rawData = await response.json();
					if (!isNpmPackageData(rawData)) {
						return {
							package: packageNameForOutput,
							status: 'error',
							error: 'Invalid package data received from registry',
							data: null,
							message: `Received malformed data for ${packageNameForOutput}.`,
						};
					}

					const mapDeps = (deps: Record<string, string> | undefined) => {
						if (!deps) return [];
						return Object.entries(deps).map(([depName, depVersion]) => ({
							name: depName,
							version: depVersion,
						}));
					};

					const actualVersion = rawData.version || version; // Use version from response if available
					const finalPackageName = `${name}@${actualVersion}`;

					// Fetch transitive dependencies from deps.dev to provide deep topological insights
					const transitiveGraphRaw = await fetchTransitiveDependenciesFromDepsDev(
						name,
						actualVersion,
					);
					// Erase root package from the graph to avoid self-counting if returned
					const transitiveGraph = transitiveGraphRaw.filter((dep) => dep.name !== name);

					const depData = {
						dependencies: mapDeps(rawData.dependencies),
						devDependencies: mapDeps(rawData.devDependencies),
						peerDependencies: mapDeps(rawData.peerDependencies),
						transitiveCount: transitiveGraph.length,
						transitiveGraph: transitiveGraph,
					};

					// Store with the actual resolved package name if 'latest' was used
					cacheSet(cacheKey, { depData, packageNameForCache: finalPackageName }, CACHE_TTL_MEDIUM);

					return {
						package: finalPackageName,
						status: 'success',
						error: null,
						data: depData,
						message: `Dependencies for ${finalPackageName} (Direct: ${depData.dependencies.length}, Transitive: ${depData.transitiveCount})`,
					};
				} catch (error) {
					return {
						package: packageNameForOutput,
						status: 'error',
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing ${packageNameForOutput}.`,
					};
				}
			}),
		);

		const responseJson = JSON.stringify({ results: processedResults }, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				results: [],
				error: `General error fetching dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmTypes(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let version = 'latest'; // Default to 'latest'

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						version = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						package: 'unknown_package_input',
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						package: pkgInput,
						status: 'error',
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				const packageNameForOutput = version === 'latest' ? name : `${name}@${version}`;

				// As with handleNpmDeps, we cache based on the input version string for simplicity.
				const cacheKey = generateCacheKey('handleNpmTypes', name, version);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						package: cachedData.finalPackageName || packageNameForOutput,
						status: 'success_cache',
						error: null,
						data: cachedData.typesData,
						message: `TypeScript information for ${cachedData.finalPackageName || packageNameForOutput} from cache.`,
					};
				}

				try {
					const resolvedVersion = await resolveVersionIfShorthand(name, version);
					const response = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}/${resolvedVersion}`);

					if (!response.ok) {
						return {
							package: packageNameForOutput,
							status: 'error',
							error: `Failed to fetch package info: ${response.status} ${response.statusText}`,
							data: null,
							message: `Could not retrieve information for ${packageNameForOutput}.`,
						};
					}

					const mainPackageData = (await response.json()) as NpmPackageData;
					const actualVersion = mainPackageData.version || version; // Use version from response
					const finalPackageName = `${name}@${actualVersion}`;

					const hasBuiltInTypes = Boolean(mainPackageData.types || mainPackageData.typings);
					const typesPath = mainPackageData.types || mainPackageData.typings || null;

					const typesPackageName = `@types/${name.replace('@', '').replace('/', '__')}`;
					let typesPackageInfo: any = {
						name: typesPackageName,
						version: null,
						isAvailable: false,
					};

					try {
						const typesResponse = await fetchWithRetry(
							`${NPM_REGISTRY_URL}/${typesPackageName}/latest`,
						);
						if (typesResponse.ok) {
							const typesData = (await typesResponse.json()) as NpmPackageData;
							typesPackageInfo = {
								name: typesPackageName,
								version: typesData.version || 'unknown',
								isAvailable: true,
							};
						}
					} catch (typesError) {
						// Keep this debug for visibility on @types fetch failures
						console.debug(`Could not fetch @types package ${typesPackageName}: ${typesError}`);
					}

					const resultData = {
						mainPackage: {
							name: name,
							version: actualVersion,
							hasBuiltInTypes: hasBuiltInTypes,
							typesPath: typesPath,
						},
						typesPackage: typesPackageInfo,
					};

					cacheSet(cacheKey, { typesData: resultData, finalPackageName }, CACHE_TTL_LONG);

					return {
						package: finalPackageName,
						status: 'success',
						error: null,
						data: resultData,
						message: `TypeScript information for ${finalPackageName}`,
					};
				} catch (error) {
					return {
						package: packageNameForOutput,
						status: 'error',
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing ${packageNameForOutput}.`,
					};
				}
			}),
		);

		const responseJson = JSON.stringify({ results: processedResults }, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				results: [],
				error: `General error checking TypeScript types: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmSize(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let version = 'latest'; // Default to 'latest'

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						version = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						package: 'unknown_package_input',
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						package: pkgInput,
						status: 'error',
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				const bundlephobiaQuery = version === 'latest' ? name : `${name}@${version}`;
				const packageNameForOutput = bundlephobiaQuery;

				const cacheKey = generateCacheKey('handleNpmSize', bundlephobiaQuery);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						package: packageNameForOutput, // Or cachedData.packageName if stored
						status: 'success_cache',
						error: null,
						data: cachedData,
						message: `Size information for ${packageNameForOutput} from cache.`,
					};
				}

				try {
					const response = await fetchWithRetry(
						`https://bundlephobia.com/api/size?package=${bundlephobiaQuery}`,
					);

					if (!response.ok) {
						let errorMsg = `Failed to fetch package size: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${packageNameForOutput} not found or version not available on Bundlephobia.`;
						}
						return {
							package: packageNameForOutput,
							status: 'error',
							error: errorMsg,
							data: null,
							message: `Could not retrieve size information for ${packageNameForOutput}.`,
						};
					}

					const rawData: any = await response.json();

					if (rawData.error) {
						return {
							package: packageNameForOutput,
							status: 'error',
							error: `Bundlephobia error: ${rawData.error.message || 'Unknown error'}`,
							data: null,
							message: `Bundlephobia reported an error for ${packageNameForOutput}.`,
						};
					}

					if (!isBundlephobiaData(rawData)) {
						return {
							package: packageNameForOutput,
							status: 'error',
							error: 'Invalid package data received from Bundlephobia',
							data: null,
							message: `Received malformed size data for ${packageNameForOutput}.`,
						};
					}

					const typedRawData = rawData as BundlephobiaData;

					const sizeData = {
						name: (typedRawData as any).name || name,
						version:
							(typedRawData as any).version || (version === 'latest' ? 'latest_resolved' : version),
						sizeInKb: Number((typedRawData.size / 1024).toFixed(2)),
						gzipInKb: Number((typedRawData.gzip / 1024).toFixed(2)),
						dependencyCount: typedRawData.dependencyCount,
					};

					cacheSet(cacheKey, sizeData, CACHE_TTL_MEDIUM);

					return {
						package: packageNameForOutput,
						status: 'success',
						error: null,
						data: sizeData,
						message: `Size information for ${packageNameForOutput}`,
					};
				} catch (error) {
					return {
						package: packageNameForOutput,
						status: 'error',
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing ${packageNameForOutput}.`,
					};
				}
			}),
		);

		const responseJson = JSON.stringify({ results: processedResults }, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				results: [],
				error: `General error fetching package sizes: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

// Helper to fetch full transitive dependency graph from deps.dev
async function fetchTransitiveDependenciesFromDepsDev(
	pkgName: string,
	version: string,
): Promise<{ name: string; version: string }[]> {
	try {
		const encodedName = encodeURIComponent(pkgName);
		const encodedVersion = encodeURIComponent(version);
		const url = `https://api.deps.dev/v3/systems/npm/packages/${encodedName}/versions/${encodedVersion}:dependencies`;

		const response = await fetchWithRetry(url);

		if (!response.ok) {
			console.warn(`deps.dev API returned ${response.status} for ${pkgName}@${version}`);
			return [];
		}

		const data = (await response.json()) as any;
		if (!data.nodes || !Array.isArray(data.nodes)) return [];

		return data.nodes
			.filter((node: any) => node.versionKey?.name)
			.map((node: any) => ({
				name: node.versionKey.name,
				version: node.versionKey.version,
			}));
	} catch (error) {
		console.error(`Error fetching transitive dependencies from deps.dev for ${pkgName}:`, error);
		return [];
	}
}

export interface DepsDevProjectData {
	starsCount: number;
	forksCount: number;
	openIssuesCount: number;
	license: string;
	description: string;
	homepage: string;
	scorecard?: {
		overallScore: number;
		checks: Array<{ name: string; score: number; reason: string }>;
	};
}

export async function fetchRepoStatsFromDepsDev(
	owner: string,
	repo: string,
	ignoreCache = false,
): Promise<DepsDevProjectData | null> {
	const projectKey = encodeURIComponent(`github.com/${owner}/${repo}`);
	const cacheKey = generateCacheKey('depsDevProject', owner, repo);
	const cached = ignoreCache ? undefined : cacheGet<DepsDevProjectData>(cacheKey);
	if (cached) return cached;

	try {
		const response = await fetchWithRetry(
			`https://api.deps.dev/v3alpha/projects/${projectKey}`,
			{},
			{ maxRetries: 1 },
		);
		if (!response.ok) return null;

		const data = (await response.json()) as any;
		const result: DepsDevProjectData = {
			starsCount: data.starsCount ?? 0,
			forksCount: data.forksCount ?? 0,
			openIssuesCount: data.openIssuesCount ?? 0,
			license: data.license ?? 'unknown',
			description: data.description ?? '',
			homepage: data.homepage ?? '',
			scorecard: data.scorecard
				? {
						overallScore: data.scorecard.overallScore,
						checks: (data.scorecard.checks || []).map((c: any) => ({
							name: c.name,
							score: c.score,
							reason:
								c.reason &&
								(c.score === -1 || c.reason.toLowerCase().includes('internal error')) &&
								(c.reason.toLowerCase().includes('internal error') ||
									c.reason.toLowerCase().includes('classic branch protection rules'))
									? 'Check not evaluated due to upstream OpenSSF Scorecard API permission limits'
									: c.reason || 'No details provided',
						})),
					}
				: undefined,
		};

		cacheSet(cacheKey, result, CACHE_TTL_VERY_LONG);
		return result;
	} catch {
		return null;
	}
}

// Helper to resolve 'latest' tag to actual version number
async function resolveLatestVersion(packageName: string): Promise<string | null> {
	try {
		const response = await fetchWithRetry(`${NPM_REGISTRY_URL}/${packageName}/latest`);
		if (!response.ok) return null;
		const data = (await response.json()) as any;
		return data.version || null;
	} catch {
		return null;
	}
}

// Known ecosystem groups that share versioning
const ECOSYSTEM_MAP: Record<string, string[]> = {
	react: ['react-dom', 'react-server-dom-webpack', 'react-server-dom-parcel'],
};

// Helper to fetch full vulnerability details (enrichment)
async function enrichVulnerabilityData(vulnId: string, ignoreCache = false): Promise<any> {
	const cacheKey = generateCacheKey('enrichVuln', vulnId);
	const cached = ignoreCache ? undefined : cacheGet<any>(cacheKey);
	if (cached) return cached;

	try {
		const response = await fetchWithRetry(`https://api.osv.dev/v1/vulns/${vulnId}`);
		if (!response.ok) return null;
		const data = await response.json();
		cacheSet(cacheKey, data, CACHE_TTL_LONG);
		return data;
	} catch (error) {
		console.error(`Failed to enrich vulnerability ${vulnId}:`, error);
		return null;
	}
}

export async function handleNpmVulnerabilities(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		// Prepare batch query, checking cache first
		const finalBatchQueries: any[] = [];
		const packageMap = new Map<
			string,
			{ name: string; version?: string; isDependency?: boolean }
		>();
		const cachedResultsMap = new Map<string, any>();

		const addToQuery = (name: string, releaseVersion: string, isDep: boolean) => {
			const version = releaseVersion === 'latest' ? undefined : releaseVersion;
			const key = `${name}@${version || 'latest'}`;

			if (packageMap.has(key)) return; // Already requested/processed

			// Check Cache
			const cacheKey = generateCacheKey('handleNpmVulnerabilities', name, version || 'all');
			const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

			if (cachedData) {
				// Store cached result directly using the same structure as we will build later
				cachedResultsMap.set(key, {
					package: `${name}${version ? `@${version}` : ''}`,
					isDependency: isDep,
					vulnerabilities: cachedData.vulnerabilities,
					count: cachedData.vulnerabilities.length,
					status: cachedData.vulnerabilities.length > 0 ? 'vulnerable' : 'secure',
					source: 'cache',
				});
				packageMap.set(key, { name, version, isDependency: isDep });
			} else {
				// Not in cache, add to API query
				packageMap.set(key, { name, version, isDependency: isDep });
				finalBatchQueries.push({
					package: { name, ecosystem: 'npm' },
					version: version === 'latest' ? undefined : version,
				});
			}
		};

		const processPackage = async (name: string, version: string | undefined) => {
			const safeVersion = version || 'latest';

			// Always add the root package (depth 0 logic)
			addToQuery(name, safeVersion, false);

			// Try to get all transitive dependencies in a single call to deps.dev
			// They require a concrete version (or we pass exactly what we have)
			const allDeps = await fetchTransitiveDependenciesFromDepsDev(name, safeVersion);

			for (const dep of allDeps) {
				// Avoid adding the root package itself again, which is included in the graph
				if (dep.name === name) continue;
				addToQuery(dep.name, dep.version, true);
			}
		};

		const validationErrors: any[] = [];
		const validPackagesToProcess = packagesToProcess.filter((pkgInput) => {
			let name = '';
			if (typeof pkgInput === 'string') {
				const atIdx = pkgInput.lastIndexOf('@');
				if (pkgInput.startsWith('@')) {
					const secondAt = pkgInput.indexOf('@', 1);
					if (secondAt > 0) {
						name = pkgInput.slice(0, secondAt);
					} else {
						name = pkgInput;
					}
				} else {
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
					} else {
						name = pkgInput;
					}
				}
			} else {
				return false; // Type check handled before basically or skipped
			}

			if (!isValidNpmPackageName(name)) {
				validationErrors.push({
					package: pkgInput,
					status: 'error',
					error: 'Invalid package name format',
					data: null,
					message: `The package name "${name}" is invalid/malformed.`,
				});
				return false;
			}
			return true;
		});

		await Promise.all(
			validPackagesToProcess.map(async (pkgInput) => {
				let name = '';
				let version = 'latest';

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (pkgInput.startsWith('@')) {
						const secondAt = pkgInput.indexOf('@', 1);
						if (secondAt > 0) {
							name = pkgInput.slice(0, secondAt);
							version = pkgInput.slice(secondAt + 1);
						} else {
							name = pkgInput;
						}
					} else {
						if (atIdx > 0) {
							name = pkgInput.slice(0, atIdx);
							version = pkgInput.slice(atIdx + 1);
						} else {
							name = pkgInput;
						}
					}
				}

				// Resolve 'latest' to actual version number for the root package
				if (version === 'latest') {
					const resolved = await resolveLatestVersion(name);
					if (resolved) {
						version = resolved;
					}
				}

				// Start fetching dependencies with deps.dev
				await processPackage(name, version);

				// Ecosystem Check: Scan associated packages that share the same version
				if (Object.hasOwn(ECOSYSTEM_MAP, name) && Array.isArray(ECOSYSTEM_MAP[name])) {
					for (const associatedPkg of ECOSYSTEM_MAP[name]) {
						await processPackage(associatedPkg, version);
					}
				}
			}),
		);
		let apiResults: any[] = [];

		if (finalBatchQueries.length > 0) {
			// Perform Batch API call to OSV for non-cached items
			const response = await fetchWithRetry('https://api.osv.dev/v1/querybatch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ queries: finalBatchQueries }),
			});

			if (!response.ok) {
				throw new Error(`OSV Batch API Error: ${response.status} ${response.statusText}`);
			}

			const batchData = (await response.json()) as { results: { vulns?: any[] }[] };
			apiResults = batchData.results || [];
		}

		// Reconstruct all results (Cache + API)
		// We iterate over the packageMap to maintain order essentially, or we reconstruct based on what we see
		// Since map iteration order is insertion order, we can use that to return results generally in order of discovery

		// Map API results back to their query keys to merge easily
		const apiResultsMap = new Map<string, any>();
		finalBatchQueries.forEach((query, index) => {
			const vulns = apiResults[index]?.vulns || [];
			const pkgName = query.package.name;
			const pkgVersion = query.version;
			const key = `${pkgName}@${pkgVersion || 'latest'}`;
			apiResultsMap.set(key, vulns);
		});

		const processedResults: any[] = [];

		for (const [key, info] of packageMap.entries()) {
			if (cachedResultsMap.has(key)) {
				processedResults.push(cachedResultsMap.get(key));
				continue;
			}

			// Process API result
			const vulns = apiResultsMap.get(key) || [];

			// Enrich vulnerabilities with full details (Summary, Aliases/CVEs)
			const processedVulns = await Promise.all(
				vulns.map(async (vuln: any) => {
					// Fetch full details
					const richData = await enrichVulnerabilityData(vuln.id, args.ignoreCache);
					const finalVuln = richData || vuln; // Fallback to basic if fetch fails

					let sev = 'Unknown';
					if (typeof finalVuln.database_specific?.severity === 'string') {
						sev = finalVuln.database_specific.severity;
					} else if (Array.isArray(finalVuln.severity) && finalVuln.severity.length > 0) {
						const first = finalVuln.severity[0];
						if (typeof first === 'string') {
							sev = first;
						} else if (first && typeof first === 'object') {
							sev = first.score || first.type || 'Unknown';
						}
					} else if (typeof finalVuln.severity === 'string') {
						sev = finalVuln.severity;
					} else if (typeof finalVuln.ecosystem_specific?.severity === 'string') {
						sev = finalVuln.ecosystem_specific.severity;
					}
					const refs = finalVuln.references ? finalVuln.references.map((r: any) => r.url) : [];

					const vulnerabilityDetails: any = {
						id: finalVuln.id,
						summary: finalVuln.summary || 'No summary available',
						severity: sev,
						references: refs,
						aliases: finalVuln.aliases || [],
						modified: finalVuln.modified,
						published: finalVuln.published,
					};
					if (finalVuln.affected) vulnerabilityDetails.affected = finalVuln.affected;
					return vulnerabilityDetails;
				}),
			);

			const resultEntry = {
				package: `${info.name}${info.version && info.version !== 'latest' && info.version !== undefined ? `@${info.version}` : ''}`,
				isDependency: info.isDependency,
				vulnerabilities: processedVulns,
				count: processedVulns.length,
				status: processedVulns.length > 0 ? 'vulnerable' : 'secure',
				message:
					processedVulns.length > 0
						? `${processedVulns.length} vulnerability(ies) found`
						: 'No known vulnerabilities found',
			};

			processedResults.push(resultEntry);

			// Cache this result for future
			const cacheKey = generateCacheKey(
				'handleNpmVulnerabilities',
				info.name,
				info.version || 'all',
			);
			cacheSet(
				cacheKey,
				{
					vulnerabilities: processedVulns,
					message: `${processedVulns.length} vulnerabilities found`,
				},
				CACHE_TTL_MEDIUM,
			);
		}

		// Filter final output
		const finalOutput = processedResults.filter((r) => r.count > 0 || !r.isDependency);

		const responseJson = JSON.stringify(
			{
				summary: `Scanned ${packageMap.size} packages (including dependencies). Found vulnerabilities in ${finalOutput.filter((r) => r.count > 0).length} packages. (${cachedResultsMap.size} from cache, ${finalBatchQueries.length} from API). ${validationErrors.length} invalid inputs skipped.`,
				results: [...finalOutput, ...validationErrors],
			},
			null,
			2,
		);

		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				results: [],
				error: `General error checking vulnerabilities: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmTrends(args: {
	packages: string[];
	period?: 'last-week' | 'last-month' | 'last-year';
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided for trends analysis.');
		}

		const period =
			args.period && ['last-week', 'last-month', 'last-year'].includes(args.period)
				? args.period
				: 'last-month';

		const periodDaysMap = {
			'last-week': 7,
			'last-month': 30,
			'last-year': 365,
		};
		const daysInPeriod = periodDaysMap[period];

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					name = atIdx > 0 ? pkgInput.slice(0, atIdx) : pkgInput;
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				const cacheKey = generateCacheKey('handleNpmTrends', name, period);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success_cache' as const,
						error: null,
						data: cachedData,
						message: `Download trends for ${name} (${period}) from cache.`,
					};
				}

				try {
					const response = await fetchWithRetry(
						`https://api.npmjs.org/downloads/point/${period}/${name}`,
					);

					if (!response.ok) {
						let errorMsg = `Failed to fetch download trends: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name} not found or no download data for the period.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: errorMsg,
							data: null,
						};
					}

					const data = await response.json();
					if (!isNpmDownloadsData(data)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: 'Invalid response format from npm downloads API',
							data: null,
						};
					}

					const trendData = {
						downloads: data.downloads,
						period: period,
						startDate: data.start,
						endDate: data.end,
						averageDailyDownloads: Math.round(data.downloads / daysInPeriod),
					};

					cacheSet(cacheKey, trendData, CACHE_TTL_MEDIUM);

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: trendData,
						message: `Successfully fetched download trends for ${name} (${period}).`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
					};
				}
			}),
		);

		let totalSuccessful = 0;
		let overallTotalDownloads = 0;

		for (const result of processedResults) {
			if (result.status === 'success' && result.data) {
				totalSuccessful++;
				overallTotalDownloads += result.data.downloads;
			}
		}

		const summary = {
			totalPackagesProcessed: packagesToProcess.length,
			totalSuccessful: totalSuccessful,
			totalFailed: packagesToProcess.length - totalSuccessful,
			overallTotalDownloads: overallTotalDownloads,
			overallAverageDailyDownloads:
				totalSuccessful > 0
					? Math.round(overallTotalDownloads / daysInPeriod / totalSuccessful)
					: 0,
		};

		const finalResponse = {
			query: {
				packagesInput: args.packages,
				periodUsed: period,
			},
			results: processedResults,
			summary: summary,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				query: { packagesInput: args.packages, periodUsed: args.period || 'last-month' },
				results: [],
				summary: null,
				error: `General error fetching download trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmCompare(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided for comparison.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let versionTag = 'latest';

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						versionTag = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						versionQueried: versionTag,
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}
				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						versionQueried: versionTag,
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				const cacheKey = generateCacheKey('handleNpmCompare', name, versionTag);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name, // Or cachedData.name if preferred
						versionQueried: versionTag,
						status: 'success_cache' as const,
						error: null,
						data: cachedData,
						message: `Comparison data for ${name}@${versionTag} from cache.`,
					};
				}

				try {
					const resolvedVersion = await resolveVersionIfShorthand(name, versionTag);
					// Fetch package version details from registry
					const pkgResponse = await fetchWithRetry(
						`${NPM_REGISTRY_URL}/${name}/${resolvedVersion}`,
					);
					if (!pkgResponse.ok) {
						throw new Error(
							`Failed to fetch package info for ${name}@${versionTag}: ${pkgResponse.status} ${pkgResponse.statusText}`,
						);
					}
					const pkgData = await pkgResponse.json();
					if (!isNpmPackageVersionData(pkgData)) {
						throw new Error(`Invalid package data format for ${name}@${versionTag}`);
					}

					// Fetch monthly downloads
					let monthlyDownloads: number | null = null;
					try {
						const downloadsResponse = await fetchWithRetry(
							`https://api.npmjs.org/downloads/point/last-month/${name}`,
						);
						if (downloadsResponse.ok) {
							const downloadsData = await downloadsResponse.json();
							if (isNpmDownloadsData(downloadsData)) {
								monthlyDownloads = downloadsData.downloads;
							}
						}
					} catch (dlError) {
						console.debug(`Could not fetch downloads for ${name}: ${dlError}`);
					}

					// Fetch publish date for this specific version
					// Need to fetch the full package info to get to the 'time' field for specific version
					let publishDate: string | null = null;
					try {
						const fullPkgInfoResponse = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}`);
						if (fullPkgInfoResponse.ok) {
							const fullPkgInfo = await fullPkgInfoResponse.json();
							if (isNpmPackageInfo(fullPkgInfo) && fullPkgInfo.time) {
								publishDate = fullPkgInfo.time[pkgData.version] || null;
							}
						}
					} catch (timeError) {
						console.debug(`Could not fetch time info for ${name}: ${timeError}`);
					}

					const comparisonData = {
						name: pkgData.name,
						version: pkgData.version,
						description: pkgData.description || null,
						license: pkgData.license || null,
						dependenciesCount: Object.keys(pkgData.dependencies || {}).length,
						devDependenciesCount: Object.keys(pkgData.devDependencies || {}).length,
						peerDependenciesCount: Object.keys(pkgData.peerDependencies || {}).length,
						monthlyDownloads: monthlyDownloads,
						publishDate: publishDate,
						repositoryUrl: pkgData.repository?.url || null,
					};

					cacheSet(cacheKey, comparisonData, CACHE_TTL_MEDIUM);

					return {
						packageInput: pkgInput,
						packageName: name, // or comparisonData.name
						versionQueried: versionTag,
						status: 'success' as const,
						error: null,
						data: comparisonData,
						message: `Successfully fetched comparison data for ${name}@${pkgData.version}.`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
					};
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
			message: `Comparison data for ${args.packages.length} package(s).`,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error comparing packages: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export interface LocalScoreResult {
	packageName: string;
	version: string;
	description: string | null;
	analyzedAt: string;
	downloadsLastMonth: number;
	github: {
		starsCount: number;
		forksCount: number;
		subscribersCount: number;
		openIssuesCount: number;
		hasGitHubData: boolean;
	};
	score: {
		final: number;
		detail: {
			quality: number;
			popularity: number;
			maintenance: number;
		};
	};
	scorecard?: {
		overallScore: number;
		checks: Array<{ name: string; score: number; reason: string }>;
	};
}

export async function getLocalPackageMetrics(
	name: string,
	ignoreCache = false,
): Promise<LocalScoreResult> {
	const cacheKey = generateCacheKey('localMetrics', name);
	const cached = ignoreCache ? undefined : cacheGet<LocalScoreResult>(cacheKey);
	if (cached) return cached;

	// 1. Fetch full packument from registry
	const registryResponse = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}`);
	if (!registryResponse.ok) {
		throw new Error(`Package ${name} not found on registry.`);
	}
	const packageInfo = await registryResponse.json();
	if (!isNpmPackageInfo(packageInfo)) {
		throw new Error(`Invalid registry data received for ${name}.`);
	}

	const latestVersion = packageInfo['dist-tags']?.latest;
	if (!latestVersion || !packageInfo.versions?.[latestVersion]) {
		throw new Error(`No latest version found for ${name}.`);
	}

	const versionData = packageInfo.versions[latestVersion];
	const hasTypes = Boolean(
		versionData.types || versionData.typings || versionData.dependencies?.[`@types/${name}`],
	);
	const hasReadme = Boolean(versionData.readme || packageInfo.readme);
	const dependencyCount = Object.keys(versionData.dependencies || {}).length;

	// 2. Fetch downloads for last month
	let downloadsLastMonth = 0;
	try {
		const downloadsResponse = await fetchWithRetry(
			`https://api.npmjs.org/downloads/point/last-month/${name}`,
		);
		if (downloadsResponse.ok) {
			const dlData = await downloadsResponse.json();
			downloadsLastMonth = dlData.downloads || 0;
		}
	} catch (dlError) {
		console.debug(`Could not fetch downloads for ${name}: ${dlError}`);
	}

	// 3. Fetch GitHub stats via deps.dev (optional, graceful degradation)
	let github = {
		starsCount: 0,
		forksCount: 0,
		subscribersCount: 0,
		openIssuesCount: 0,
		hasGitHubData: false,
	};
	let scorecard: LocalScoreResult['scorecard'];

	const repoUrl = versionData.repository?.url || packageInfo.repository?.url;
	if (repoUrl?.includes('github.com')) {
		const githubMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
		if (githubMatch) {
			const [, owner, repo] = githubMatch;
			const cleanRepo = repo.replace(/\.git$/, '');
			try {
				const depsDevData = await fetchRepoStatsFromDepsDev(owner, cleanRepo, ignoreCache);
				if (depsDevData) {
					github = {
						starsCount: depsDevData.starsCount,
						forksCount: depsDevData.forksCount,
						subscribersCount: 0,
						openIssuesCount: depsDevData.openIssuesCount,
						hasGitHubData: true,
					};
					scorecard = depsDevData.scorecard;
				}
			} catch (ghError) {
				console.debug(
					`Could not fetch deps.dev project data for ${owner}/${cleanRepo}: ${ghError}`,
				);
			}
		}
	}

	// 4. Calculate publish age
	let lastPublishDaysAgo = 365;
	const timeObj = packageInfo.time;
	if (timeObj?.[latestVersion]) {
		const publishDate = new Date(timeObj[latestVersion]);
		const diffTime = Math.abs(Date.now() - publishDate.getTime());
		lastPublishDaysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	}

	// 5. Scoring Algorithm
	const popularityNPM = Math.min(1, Math.log10(Math.max(1, downloadsLastMonth)) / 8);
	let popularity = popularityNPM;
	if (github.hasGitHubData) {
		const popularityGH = Math.min(1, github.starsCount / 50000);
		popularity = popularityNPM * 0.7 + popularityGH * 0.3;
	}

	const quality =
		(hasTypes ? 0.3 : 0) + (hasReadme ? 0.2 : 0) + Math.max(0, 0.5 - dependencyCount * 0.005);

	const maintenancePublish =
		lastPublishDaysAgo < 30
			? 1.0
			: lastPublishDaysAgo < 90
				? 0.8
				: lastPublishDaysAgo < 365
					? 0.5
					: 0.2;
	let maintenance = maintenancePublish;
	if (github.hasGitHubData) {
		const issuesScore =
			github.openIssuesCount < 50 ? 0.3 : github.openIssuesCount < 200 ? 0.2 : 0.1;
		maintenance = maintenancePublish * 0.7 + issuesScore;
	}

	const finalScore = popularity * 0.4 + quality * 0.3 + maintenance * 0.3;

	const result: LocalScoreResult = {
		packageName: name,
		version: latestVersion,
		description: versionData.description || null,
		analyzedAt: new Date().toISOString(),
		downloadsLastMonth,
		github,
		score: {
			final: finalScore,
			detail: {
				quality,
				popularity,
				maintenance,
			},
		},
		scorecard,
	};

	cacheSet(cacheKey, result, CACHE_TTL_LONG);
	return result;
}

// Function to get package quality metrics
export async function handleNpmQuality(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided to fetch quality metrics.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					name = atIdx > 0 ? pkgInput.slice(0, atIdx) : pkgInput;
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
					};
				}

				const cacheKey = generateCacheKey('handleNpmQuality', name);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name, // Or cachedData.packageName if stored differently
						status: 'success_cache' as const,
						error: null,
						data: cachedData,
						message: `Quality score for ${name} (version analyzed: ${cachedData.versionInScore}) from cache.`,
					};
				}

				try {
					const metrics = await getLocalPackageMetrics(name, args.ignoreCache);
					const qualityData = {
						analyzedAt: metrics.analyzedAt,
						versionInScore: metrics.version,
						qualityScore: metrics.score.detail.quality,
					};

					cacheSet(cacheKey, qualityData, CACHE_TTL_LONG);

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: qualityData,
						message: `Successfully fetched quality score for ${name} (version analyzed: ${metrics.version}).`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing quality for ${name}.`,
					};
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error fetching quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

// Function to get package maintenance metrics
export async function handleNpmMaintenance(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided to fetch maintenance metrics.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					name = atIdx > 0 ? pkgInput.slice(0, atIdx) : pkgInput;
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
					};
				}

				const cacheKey = generateCacheKey('handleNpmMaintenance', name);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success_cache' as const,
						error: null,
						data: cachedData,
						message: `Maintenance score for ${name} (version analyzed: ${cachedData.versionInScore}) from cache.`,
					};
				}

				try {
					const metrics = await getLocalPackageMetrics(name, args.ignoreCache);
					const maintenanceData = {
						analyzedAt: metrics.analyzedAt,
						versionInScore: metrics.version,
						maintenanceScore: metrics.score.detail.maintenance,
					};

					cacheSet(cacheKey, maintenanceData, CACHE_TTL_LONG);

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: maintenanceData,
						message: `Successfully fetched maintenance score for ${name} (version analyzed: ${metrics.version}).`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing maintenance for ${name}.`,
					};
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error fetching maintenance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmMaintainers(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided to fetch maintainers.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					name = atIdx > 0 ? pkgInput.slice(0, atIdx) : pkgInput; // Version is ignored for maintainers
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				const cacheKey = generateCacheKey('handleNpmMaintainers', name);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success_cache' as const,
						error: null,
						data: cachedData,
						message: `Maintainer information for ${name} from cache.`,
					};
				}

				try {
					const response = await fetch(`${NPM_REGISTRY_URL}/${encodeURIComponent(name)}`);

					if (!response.ok) {
						let errorMsg = `Failed to fetch package info: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name} not found in the npm registry.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: errorMsg,
							data: null,
						};
					}

					const data = await response.json();
					if (!isNpmPackageInfo(data)) {
						// Using NpmPackageInfoSchema as it contains maintainers
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: 'Invalid package info data received from registry',
							data: null,
						};
					}

					const maintainers = (data.maintainers || []).map((m) => ({
						name: m.name,
						email: m.email || null, // Ensure email is null if not present
						url: m.url || null, // NpmMaintainerSchema has url optional
					}));

					const maintainersData = {
						maintainers: maintainers,
						maintainersCount: maintainers.length,
					};

					cacheSet(cacheKey, maintainersData, CACHE_TTL_VERY_LONG);

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: maintainersData,
						message: `Successfully fetched maintainer information for ${name}.`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
					};
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
			message: `Maintainer information for ${args.packages.length} package(s).`,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error fetching maintainer information: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

// Function to get package score
export async function handleNpmScore(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided to fetch scores.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					name = atIdx > 0 ? pkgInput.slice(0, atIdx) : pkgInput; // Version is ignored by npms.io API endpoint
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				const cacheKey = generateCacheKey('handleNpmScore', name);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success_cache' as const,
						error: null,
						data: cachedData,
						message: `Score data for ${name} (version analyzed: ${cachedData.versionInScore}) from cache.`,
					};
				}

				try {
					const metrics = await getLocalPackageMetrics(name, args.ignoreCache);
					const scoreData = {
						analyzedAt: metrics.analyzedAt,
						versionInScore: metrics.version,
						score: metrics.score,
						packageInfoFromScore: {
							name: metrics.packageName,
							version: metrics.version,
							description: metrics.description,
						},
						npmStats: {
							downloadsLastMonth: metrics.downloadsLastMonth,
							starsCount: metrics.github.hasGitHubData ? metrics.github.starsCount : 0, // Fallback best effort
						},
						githubStats: metrics.github.hasGitHubData
							? {
									starsCount: metrics.github.starsCount,
									forksCount: metrics.github.forksCount,
									subscribersCount: metrics.github.subscribersCount,
									issues: {
										count: metrics.github.openIssuesCount, // Heuristic default count = open issues
										openCount: metrics.github.openIssuesCount,
									},
								}
							: null,
						scorecard: metrics.scorecard,
					};

					cacheSet(cacheKey, scoreData, CACHE_TTL_LONG);

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: scoreData,
						message: `Successfully fetched score data for ${name} (version analyzed: ${metrics.version}).`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
					};
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
			message: `Score information for ${args.packages.length} package(s).`,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error fetching package scores: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function fetchReadmeFromCDN(
	packageName: string,
	version: string,
): Promise<string | null> {
	const cdnUrls = [
		`https://cdn.jsdelivr.net/npm/${packageName}@${version}/README.md`,
		`https://unpkg.com/${packageName}@${version}/README.md`,
	];

	for (const cdnUrl of cdnUrls) {
		try {
			const response = await fetchWithRetry(
				cdnUrl,
				{ headers: { Accept: 'text/plain' } },
				{ maxRetries: 1, skipThrottle: true },
			);

			if (response.ok) {
				const text = await response.text();
				if (text && text.length > 10) {
					return text;
				}
			}
		} catch {
			// Sigue intentando con la próxima URL
		}
	}
	return null;
}

export async function handleNpmPackageReadme(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided to fetch READMEs.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let versionTag: string | undefined; // Explicitly undefined if not specified

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						versionTag = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
						versionTag = 'latest'; // Default to latest if no version specified
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				const cacheKey = generateCacheKey('handleNpmPackageReadme', name, versionTag);
				const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: cachedData.versionFetched, // Retrieve stored fetched version
						status: 'success_cache' as const,
						error: null,
						data: { readme: cachedData.readme, hasReadme: cachedData.hasReadme },
						message: `README for ${name}@${cachedData.versionFetched} from cache.`,
					};
				}

				try {
					const response = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}`);
					if (!response.ok) {
						let errorMsg = `Failed to fetch package info: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name} not found.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionTag,
							versionFetched: null,
							status: 'error' as const,
							error: errorMsg,
							data: null,
						};
					}

					const packageInfo = await response.json();
					if (!isNpmPackageInfo(packageInfo)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionTag,
							versionFetched: null,
							status: 'error' as const,
							error: 'Invalid package info data received',
							data: null,
						};
					}

					const versionToUse = resolvePackageVersion(packageInfo, versionTag) || versionTag;

					if (!versionToUse || !packageInfo.versions?.[versionToUse]) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionTag,
							versionFetched: versionToUse || null,
							status: 'error' as const,
							error: `Version ${versionToUse || 'requested'} not found or no version data available.`,
							data: null,
						};
					}

					const versionData = packageInfo.versions[versionToUse];
					// README can be in version-specific data or at the root of packageInfo
					let readmeContent = versionData.readme || packageInfo.readme || null;
					let readmeSource: 'registry' | 'cdn' | null = readmeContent ? 'registry' : null;

					if (!readmeContent && versionToUse) {
						readmeContent = await fetchReadmeFromCDN(name, versionToUse);
						if (readmeContent) {
							readmeSource = 'cdn';
						}
					}

					const hasReadme = !!readmeContent;
					const demarcatedReadme = readmeContent
						? `<untrusted_external_content source="${readmeSource || 'registry'}" package="${name}" type="readme">\n${readmeContent}\n</untrusted_external_content>`
						: null;

					const readmeResultData = {
						readme: demarcatedReadme,
						hasReadme: hasReadme,
						readmeSource: readmeSource,
						versionFetched: versionToUse, // Store the actually fetched version
					};

					cacheSet(cacheKey, readmeResultData, CACHE_TTL_LONG);

					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: versionToUse,
						status: 'success' as const,
						error: null,
						data: { readme: demarcatedReadme, hasReadme: hasReadme, readmeSource: readmeSource },
						message: `Successfully fetched README for ${name}@${versionToUse}.`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
					};
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
			message: `README fetching status for ${args.packages.length} package(s).`,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return {
			content: [
				{
					type: 'text',
					text: responseJson,
					_meta: {
						untrustedExternalContent: true,
						sources: ['npm-registry', 'cdn'],
					},
				},
			],
			isError: false,
		};
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error fetching READMEs: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmSearch(args: {
	query: string;
	limit?: number;
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const query = args.query;
		const limit = args.limit || 10;
		if (limit < 1 || limit > 250) {
			// NPM API search limit is typically 250
			throw new Error('Limit must be between 1 and 250.');
		}

		const cacheKey = generateCacheKey('handleNpmSearch', query, limit);
		const cachedData = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

		if (cachedData) {
			const cachedResponseJson = JSON.stringify(cachedData, null, 2);
			return {
				content: [{ type: 'text', text: cachedResponseJson }],
				isError: false,
				message: `Search results for query '${query}' with limit ${limit} from cache.`,
			};
		}

		const response = await fetchWithRetry(
			`${NPM_REGISTRY_URL}/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to search packages: ${response.status} ${response.statusText}`);
		}

		const rawData = await response.json();
		const parseResult = NpmSearchResultSchema.safeParse(rawData);
		if (!parseResult.success) {
			console.error('Invalid search results data received:', parseResult.error.issues);
			throw new Error('Invalid search results data received from NPM registry.');
		}

		const { objects, total } = parseResult.data;

		const resultsData = objects.map((result) => {
			const pkg = result.package;
			const scoreDetail = result.score.detail;
			return {
				name: pkg.name,
				version: pkg.version,
				description: pkg.description || null,
				keywords: pkg.keywords || [],
				publisher: pkg.publisher
					? { username: pkg.publisher.username, email: (pkg.publisher as any).email || null }
					: null, // publisher might not have email
				date: pkg.date || null,
				links: {
					npm: pkg.links?.npm || null,
					homepage: pkg.links?.homepage || null,
					repository: pkg.links?.repository || null,
					bugs: pkg.links?.bugs || null, // NpmSearchResultSchema needs to be updated if bugs is not there
				},
				score: {
					final: result.score.final,
					detail: {
						quality: scoreDetail.quality,
						popularity: scoreDetail.popularity,
						maintenance: scoreDetail.maintenance,
					},
				},
				searchScore: result.searchScore,
			};
		});

		const finalResponse = {
			query: query,
			limitUsed: limit,
			totalResults: total,
			resultsCount: resultsData.length,
			results: resultsData,
			message: `Search completed. Found ${total} total packages, returning ${resultsData.length}.`,
		};

		cacheSet(cacheKey, finalResponse, CACHE_TTL_MEDIUM);

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				query: args.query,
				limitUsed: args.limit || 10,
				totalResults: 0,
				resultsCount: 0,
				results: [],
				error: `Error searching packages: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

// License compatibility checker
export async function handleNpmLicenseCompatibility(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided for license compatibility analysis.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let versionTag = 'latest';

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						versionTag = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				const cacheKey = generateCacheKey('npmLicenseInfoForCompatibility', name, versionTag);
				const cachedLicenseData = args.ignoreCache
					? undefined
					: cacheGet<{ license: string; versionFetched: string }>(cacheKey);

				if (cachedLicenseData) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: cachedLicenseData.versionFetched,
						status: 'success_cache' as const,
						error: null,
						data: { license: cachedLicenseData.license },
						message: `License info for ${name}@${cachedLicenseData.versionFetched} from cache.`,
					};
				}

				try {
					const resolvedVersion = await resolveVersionIfShorthand(name, versionTag);
					const response = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}/${resolvedVersion}`);
					if (!response.ok) {
						let errorMsg = `Failed to fetch package info: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name}@${versionTag} not found.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionTag,
							versionFetched: null,
							status: 'error' as const,
							error: errorMsg,
							data: null,
						};
					}

					const versionData = await response.json();
					if (!isNpmPackageVersionData(versionData)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionTag,
							versionFetched: null, // Could use versionData.version if partially valid
							status: 'error' as const,
							error: 'Invalid package version data format received',
							data: null,
						};
					}

					const licenseInfoToCache = {
						license: versionData.license || 'UNKNOWN', // Default to UNKNOWN if null/undefined
						versionFetched: versionData.version,
					};
					cacheSet(cacheKey, licenseInfoToCache, CACHE_TTL_VERY_LONG);

					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: versionData.version,
						status: 'success' as const,
						error: null,
						data: {
							license: versionData.license || 'UNKNOWN', // Default to UNKNOWN if null/undefined
						},
						message: `Successfully fetched license info for ${name}@${versionData.version}.`,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: null,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
					};
				}
			}),
		);

		// Perform analysis based on fetched licenses
		const warnings: string[] = [];
		const licensesFound = processedResults
			.filter((r) => r.status === 'success' && r.data)
			.map((r) => r.data!.license.toUpperCase()); // Use toUpperCase for case-insensitive matching

		const uniqueLicenses = [...new Set(licensesFound)];

		const hasGPL = uniqueLicenses.some((lic) => lic.includes('GPL'));
		const hasMIT = uniqueLicenses.some((lic) => lic === 'MIT');
		const hasApache = uniqueLicenses.some((lic) => lic.includes('APACHE')); // Check for APACHE generally
		const hasUnknown = uniqueLicenses.some((lic) => lic === 'UNKNOWN');
		const allSuccess = processedResults.every((r) => r.status === 'success');

		if (!allSuccess) {
			warnings.push('Could not fetch license information for all packages.');
		}
		if (hasUnknown && licensesFound.length > 0) {
			warnings.push(
				'Some packages have unknown or unspecified licenses. Manual review recommended.',
			);
		}
		if (hasGPL) {
			warnings.push('Contains GPL licensed code. Resulting work may need to be GPL licensed.');
			if (hasMIT || hasApache) {
				warnings.push(
					'Mixed GPL with potentially incompatible licenses (e.g., MIT, Apache). Review carefully for compliance.',
				);
			}
		}
		// Further refined compatibility checks can be added here if needed

		let summary = 'License compatibility analysis completed.';
		if (warnings.length > 0) {
			summary = 'License compatibility analysis completed with warnings.';
		} else if (licensesFound.length === 0 && allSuccess) {
			summary = 'No license information found for the queried packages.';
		} else if (licensesFound.length > 0 && !hasGPL && !hasUnknown) {
			summary = 'Licenses found appear to be generally compatible (non-GPL, known licenses).';
		}

		const analysis = {
			summary: summary,
			warnings: warnings,
			uniqueLicensesFound: uniqueLicenses,
		};

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
			analysis: analysis,
			message: `License compatibility check for ${args.packages.length} package(s). Note: This is a basic analysis. For legal compliance, consult a legal expert.`,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				analysis: null,
				error: `General error analyzing license compatibility: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

// Repository statistics analyzer
export async function handleNpmRepoStats(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided for repository statistics analysis.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					name = atIdx > 0 ? pkgInput.slice(0, atIdx) : pkgInput; // Version typically ignored for repo stats
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
					};
				}

				const cacheKey = generateCacheKey('handleNpmRepoStats', name);
				const cachedResult = args.ignoreCache ? undefined : cacheGet<any>(cacheKey); // Cache stores the entire result object structure

				if (cachedResult) {
					// Return the entire cached result object, which already includes status, data, message
					return {
						...cachedResult, // Spread the cached result
						packageInput: pkgInput, // Add current input for context
						packageName: name, // Add current name for context
						status: `${cachedResult.status}_cache` as const, // Append _cache to status
						message: `${cachedResult.message} (from cache)`,
					};
				}

				try {
					const npmResponse = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}/latest`);
					if (!npmResponse.ok) {
						const errorData = {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: `Failed to fetch npm info for ${name}: ${npmResponse.status} ${npmResponse.statusText}`,
							data: null,
							message: `Could not retrieve NPM package data for ${name}.`,
						};
						// Do not cache primary API call failures
						return errorData;
					}
					const npmData = await npmResponse.json();
					if (!isNpmPackageVersionData(npmData)) {
						const errorData = {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: 'Invalid NPM package data format received.',
							data: null,
							message: `Malformed NPM package data for ${name}.`,
						};
						return errorData;
					}

					const repoUrl = npmData.repository?.url;
					if (!repoUrl) {
						const resultNoRepo = {
							packageInput: pkgInput,
							packageName: name,
							status: 'no_repo_found' as const,
							error: null,
							data: null,
							message: `No repository URL found in package data for ${name}.`,
						};
						cacheSet(cacheKey, resultNoRepo, CACHE_TTL_LONG);
						return resultNoRepo;
					}

					const githubMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
					if (!githubMatch) {
						const resultNotGitHub = {
							packageInput: pkgInput,
							packageName: name,
							status: 'not_github_repo' as const,
							error: null,
							data: { repositoryUrl: repoUrl },
							message: `Repository URL found (${repoUrl}) is not a standard GitHub URL.`,
						};
						cacheSet(cacheKey, resultNotGitHub, CACHE_TTL_LONG);
						return resultNotGitHub;
					}
					const [, owner, repo] = githubMatch;
					const cleanRepo = repo.replace(/\.git$/, '');

					const depsDevData = await fetchRepoStatsFromDepsDev(owner, cleanRepo, args.ignoreCache);

					if (!depsDevData) {
						const errorData = {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: `Failed to fetch project stats for github.com/${owner}/${cleanRepo} from deps.dev`,
							data: { repositoryUrl: repoUrl },
							message: `Could not retrieve repository statistics from deps.dev.`,
						};
						return errorData;
					}

					let ghRepoMeta: any = {};
					try {
						const ghResponse = await fetchWithRetry(
							`https://api.github.com/repos/${owner}/${cleanRepo}`,
							{ headers: { Accept: 'application/vnd.github.v3+json' } },
							{ maxRetries: 0 },
						);
						if (ghResponse.ok) {
							ghRepoMeta = await ghResponse.json();
						}
					} catch {
						// Optional GitHub REST API fallback
					}

					const successResult = {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: {
							githubRepoUrl: `https://github.com/${owner}/${cleanRepo}`,
							stars: depsDevData.starsCount || ghRepoMeta.stargazers_count || 0,
							forks: depsDevData.forksCount || ghRepoMeta.forks_count || 0,
							openIssues: depsDevData.openIssuesCount || ghRepoMeta.open_issues_count || 0,
							watchers: ghRepoMeta.subscribers_count || ghRepoMeta.watchers_count || 0,
							createdAt: ghRepoMeta.created_at || null,
							updatedAt: ghRepoMeta.pushed_at || ghRepoMeta.updated_at || null,
							defaultBranch: ghRepoMeta.default_branch || null,
							hasWiki: typeof ghRepoMeta.has_wiki === 'boolean' ? ghRepoMeta.has_wiki : null,
							topics: Array.isArray(ghRepoMeta.topics) ? ghRepoMeta.topics : [],
							scorecard: depsDevData.scorecard,
						},
						message: 'Repository statistics fetched successfully from deps.dev and GitHub API.',
					};
					cacheSet(cacheKey, successResult, CACHE_TTL_LONG);
					return successResult;
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing ${name}.`,
					};
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
			message: `Repository statistics analysis for ${args.packages.length} package(s).`,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error analyzing repository stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

interface NpmSearchResponse {
	objects: Array<{
		package: {
			name: string;
			description?: string;
			version: string;
			keywords?: string[];
			date: string;
			links?: {
				repository?: string;
			};
		};
		score: {
			final: number;
		};
	}>;
	total: number;
}

interface NpmPackageVersion {
	deprecated?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

interface NpmRegistryResponse {
	versions?: Record<string, NpmPackageVersion>;
	'dist-tags'?: { latest?: string }; // Ensure dist-tags is properly typed for schema validation
	readme?: string; // Add readme for NpmPackageInfo compatibility
}

interface DownloadCount {
	downloads: number;
}

export async function handleNpmDeprecated(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let version = 'latest'; // Default to 'latest'

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						version = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						package: 'unknown_package_input',
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						package: pkgInput,
						status: 'error',
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				const initialPackageNameForOutput = version === 'latest' ? name : `${name}@${version}`;
				const cacheKey = generateCacheKey('handleNpmDeprecated', name, version);
				const cachedResult = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedResult) {
					// console.debug(`[handleNpmDeprecated] Cache hit for ${cacheKey}`);
					return {
						package: cachedResult.package,
						status: 'success_cache',
						error: null,
						data: cachedResult.data,
						message: `${cachedResult.message} (from cache)`,
					};
				}
				// console.debug(`[handleNpmDeprecated] Cache miss for ${cacheKey}`);

				try {
					const mainPkgResponse = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}`);
					if (!mainPkgResponse.ok) {
						return {
							package: initialPackageNameForOutput,
							status: 'error',
							error: `Failed to fetch package info for ${name}: ${mainPkgResponse.status} ${mainPkgResponse.statusText}`,
							data: null,
							message: `Could not retrieve main package data for ${name}.`,
						};
					}

					const mainPkgData = (await mainPkgResponse.json()) as NpmRegistryResponse;

					const versionToFetch = resolvePackageVersion(mainPkgData, version) || version;

					const finalPackageNameForOutput = `${name}@${versionToFetch}`;
					const versionInfo = mainPkgData.versions?.[versionToFetch];

					if (!versionInfo) {
						return {
							package: finalPackageNameForOutput,
							status: 'error',
							error: `Version ${versionToFetch} not found for package ${name}.`,
							data: null,
							message: `Specified version for ${name} does not exist.`,
						};
					}

					const isPackageDeprecated = !!versionInfo.deprecated;
					const packageDeprecationMessage = versionInfo.deprecated || null;

					const processDependencies = async (
						deps: Record<string, string> | undefined,
					): Promise<
						Array<{
							name: string;
							version: string;
							lookedUpAs: string;
							isDeprecated: boolean;
							deprecationMessage: string | null;
							statusMessage: string;
						}>
					> => {
						if (!deps) return [];
						const depChecks = Object.entries(deps).map(async ([depName, depSemVer]) => {
							const lookedUpAs = depName; // Strategy: always use original name, no cleaning.
							let statusMessage = '';

							try {
								// console.debug(`[handleNpmDeprecated] Checking dependency: ${depName}@${depSemVer}`);
								const depInfoResponse = await fetchWithRetry(
									`${NPM_REGISTRY_URL}/${encodeURIComponent(depName)}`,
								);

								if (!depInfoResponse.ok) {
									statusMessage = `Could not fetch dependency info for '${depName}' (status: ${depInfoResponse.status}). Deprecation status unknown.`;
									// console.warn(`[handleNpmDeprecated] ${statusMessage}`);
									return {
										name: depName,
										version: depSemVer,
										lookedUpAs: lookedUpAs,
										isDeprecated: false, // Assume not deprecated as status is unknown
										deprecationMessage: null,
										statusMessage: statusMessage,
									};
								}

								const depData = (await depInfoResponse.json()) as NpmRegistryResponse;
								const latestDepVersionTag = depData['dist-tags']?.latest;
								const latestDepVersionInfo = latestDepVersionTag
									? depData.versions?.[latestDepVersionTag]
									: undefined;

								statusMessage = `Successfully checked '${depName}'.`;
								return {
									name: depName,
									version: depSemVer,
									lookedUpAs: lookedUpAs,
									isDeprecated: !!latestDepVersionInfo?.deprecated,
									deprecationMessage: latestDepVersionInfo?.deprecated || null,
									statusMessage: statusMessage,
								};
							} catch (error) {
								const errorMessage =
									error instanceof Error ? error.message : 'Unknown processing error';
								statusMessage = `Error processing dependency '${depName}': ${errorMessage}. Deprecation status unknown.`;
								// console.warn(`[handleNpmDeprecated] ${statusMessage}`);
								return {
									name: depName,
									version: depSemVer,
									lookedUpAs: lookedUpAs,
									isDeprecated: false, // Assume not deprecated as status is unknown
									deprecationMessage: null,
									statusMessage: statusMessage,
								};
							}
						});
						return Promise.all(depChecks);
					};

					const directDeps = await processDependencies(versionInfo.dependencies);
					const devDeps = await processDependencies(versionInfo.devDependencies);
					const peerDeps = await processDependencies(versionInfo.peerDependencies);

					const allDeps = [...directDeps, ...devDeps, ...peerDeps];
					const unverifiableDepsCount = allDeps.filter((dep) => {
						const msg = dep.statusMessage.toLowerCase();
						return msg.includes('could not fetch') || msg.includes('error processing');
					}).length;

					let dependencySummaryMessage = `Processed ${allDeps.length} total dependencies.`;
					if (unverifiableDepsCount > 0) {
						dependencySummaryMessage += ` Could not verify the status for ${unverifiableDepsCount} dependencies (e.g., package name not found in registry or network issues). Their deprecation status is unknown.`;
					}

					const resultData = {
						isPackageDeprecated,
						packageDeprecationMessage,
						dependencies: {
							direct: directDeps,
							development: devDeps,
							peer: peerDeps,
						},
						dependencySummary: {
							totalDependencies: allDeps.length,
							unverifiableDependencies: unverifiableDepsCount,
							message: dependencySummaryMessage,
						},
					};

					const fullMessage = `Deprecation status for ${finalPackageNameForOutput}. ${dependencySummaryMessage}`;

					const resultToCache = {
						package: finalPackageNameForOutput,
						data: resultData,
						message: fullMessage,
					};
					cacheSet(cacheKey, resultToCache, CACHE_TTL_MEDIUM);
					// console.debug(`[handleNpmDeprecated] Set cache for ${cacheKey}`);

					return {
						package: finalPackageNameForOutput,
						status: 'success',
						error: null,
						data: resultData,
						message: fullMessage,
					};
				} catch (error) {
					// console.error(`[handleNpmDeprecated] Error processing ${initialPackageNameForOutput}: ${error}`);
					return {
						package: initialPackageNameForOutput,
						status: 'error',
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while processing ${initialPackageNameForOutput}.`,
					};
				}
			}),
		);

		const responseJson = JSON.stringify({ results: processedResults }, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		// console.error(`[handleNpmDeprecated] General error: ${error}`);
		const errorResponse = JSON.stringify(
			{
				results: [],
				error: `General error checking deprecated packages: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

export async function handleNpmChangelogAnalysis(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided for changelog analysis.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let versionQueried: string | undefined;

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						versionQueried = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						versionQueried: versionQueried,
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(name)) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionQueried,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${name}" is invalid/malformed.`,
					};
				}

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						versionQueried: versionQueried,
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
					};
				}

				const cacheKey = generateCacheKey('handleNpmChangelogAnalysis', name);
				const cachedResult = args.ignoreCache ? undefined : cacheGet<any>(cacheKey); // Expects the full result object to be cached

				if (cachedResult) {
					return {
						...cachedResult,
						packageInput: pkgInput, // Ensure these are current for this specific call
						packageName: name,
						versionQueried: versionQueried,
						status: `${cachedResult.status}_cache` as const,
						message: `${cachedResult.message} (from cache)`,
					};
				}

				try {
					const npmResponse = await fetchWithRetry(`${NPM_REGISTRY_URL}/${name}`);
					if (!npmResponse.ok) {
						const errorResult = {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'error' as const,
							error: `Failed to fetch npm info for ${name}: ${npmResponse.status} ${npmResponse.statusText}`,
							data: null,
							message: `Could not retrieve NPM package data for ${name}.`,
						};
						return errorResult; // Do not cache this type of error
					}
					const npmData = await npmResponse.json();
					if (!isNpmPackageInfo(npmData)) {
						const errorResult = {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'error' as const,
							error: 'Invalid NPM package info data received',
							data: null,
							message: `Received malformed NPM package data for ${name}.`,
						};
						return errorResult; // Do not cache this type of error
					}

					const repositoryUrl = npmData.repository?.url;
					if (!repositoryUrl) {
						const resultNoRepo = {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'no_repo_found' as const,
							error: null,
							data: null,
							message: `No repository URL found in package data for ${name}.`,
						};
						cacheSet(cacheKey, resultNoRepo, CACHE_TTL_MEDIUM);
						return resultNoRepo;
					}

					const githubMatch = repositoryUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
					if (!githubMatch) {
						const resultNotGitHub = {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'not_github_repo' as const,
							error: null,
							data: { repositoryUrl: repositoryUrl },
							message: `Repository URL (${repositoryUrl}) is not a standard GitHub URL.`,
						};
						cacheSet(cacheKey, resultNotGitHub, CACHE_TTL_MEDIUM);
						return resultNotGitHub;
					}

					const [, owner, repo] = githubMatch;
					const repoNameForUrl = repo.replace(/\.git$/, '');

					const changelogFiles = [
						'CHANGELOG.md',
						'changelog.md',
						'CHANGES.md',
						'changes.md',
						'HISTORY.md',
						'history.md',
						'NEWS.md',
						'news.md',
						'RELEASES.md',
						'releases.md',
					];
					let changelogContent: string | null = null;
					let changelogSourceUrl: string | null = null;
					let hasChangelogFile = false;

					for (const branch of ['main', 'master']) {
						for (const file of changelogFiles) {
							try {
								const rawChangelogUrl = `https://raw.githubusercontent.com/${owner}/${repoNameForUrl}/${branch}/${file}`;
								const response = await fetchWithRetry(rawChangelogUrl, {}, { maxRetries: 0 });
								if (response.ok) {
									changelogContent = await response.text();
									changelogSourceUrl = rawChangelogUrl;
									hasChangelogFile = true;
									break;
								}
							} catch {
								// Sigue intentando
							}
						}
						if (hasChangelogFile) break;
					}

					let githubReleases: any[] = [];
					try {
						const githubApiResponse = await fetchWithRetry(
							`https://api.github.com/repos/${owner}/${repoNameForUrl}/releases?per_page=5`,
							{
								headers: {
									Accept: 'application/vnd.github.v3+json',
								},
							},
							{ maxRetries: 0 },
						);
						if (githubApiResponse.ok) {
							const releasesData = (await githubApiResponse.json()) as any[];
							githubReleases = releasesData.map((r) => ({
								tag_name: r.tag_name || null,
								name: r.name || null,
								published_at: r.published_at || null,
								source: 'github-api',
							}));
						}
					} catch (error) {
						console.debug(`Error fetching GitHub releases for ${name}: ${error}`);
					}

					// Fallback to NPM Registry time/publish history if GitHub releases couldn't be fetched
					const publishTime = npmData.time;
					if (githubReleases.length === 0 && publishTime) {
						const timeKeys = Object.keys(publishTime).filter(
							(k) => k !== 'modified' && k !== 'created',
						);
						const sortedVersions = timeKeys.sort((a, b) => {
							return new Date(publishTime[b]).getTime() - new Date(publishTime[a]).getTime();
						});
						githubReleases = sortedVersions.slice(0, 5).map((v) => ({
							tag_name: `v${v}`,
							name: `Release ${v} (NPM Publish)`,
							published_at: publishTime[v],
							source: 'npm-registry',
						}));
					}

					const versions = Object.keys(npmData.versions || {});
					const npmVersionHistory = {
						totalVersions: versions.length,
						latestVersion:
							npmData['dist-tags']?.latest || (versions.length > 0 ? versions.sort().pop() : null),
						firstVersion: versions.length > 0 ? versions.sort()[0] : null,
					};

					const status =
						changelogContent || githubReleases.length > 0 ? 'success' : 'no_changelog_found';
					const message =
						status === 'success'
							? `Changelog and release information retrieved for ${name}.`
							: status === 'no_changelog_found'
								? `No changelog file or GitHub releases found for ${name}.`
								: `Changelog analysis for ${name}.`;

					const resultToCache = {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionQueried,
						status: status as 'success' | 'no_changelog_found',
						error: null,
						data: {
							repositoryUrl: repositoryUrl,
							changelogSourceUrl: changelogSourceUrl,
							changelogContent: changelogContent
								? `<untrusted_external_content source="${changelogSourceUrl || 'github'}" package="${name}" type="changelog">\n${changelogContent.split('\n').slice(0, 50).join('\n')}...\n</untrusted_external_content>`
								: null,
							hasChangelogFile: hasChangelogFile,
							githubReleases: githubReleases,
							npmVersionHistory: npmVersionHistory,
						},
						message: message,
					};
					cacheSet(cacheKey, resultToCache, CACHE_TTL_MEDIUM);
					return resultToCache;
				} catch (error) {
					const errorResult = {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionQueried,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while analyzing changelog for ${name}.`,
					};
					return errorResult; // Do not cache general errors
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return {
			content: [
				{
					type: 'text',
					text: responseJson,
					_meta: {
						untrustedExternalContent: true,
						sources: ['github-releases', 'github-raw', 'npm-registry'],
					},
				},
			],
			isError: false,
		};
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error analyzing changelogs: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}

function isAlternativeCandidate(
	candidateName: string,
	candidateDesc: string,
	originalName: string,
): boolean {
	const lowerCandidate = candidateName.toLowerCase();
	const lowerOriginal = originalName.toLowerCase();
	const lowerDesc = (candidateDesc || '').toLowerCase();

	if (lowerCandidate === lowerOriginal) return false;
	if (lowerCandidate.startsWith('@types/')) return false;

	if (
		lowerCandidate.startsWith(`${lowerOriginal}-`) ||
		lowerCandidate.startsWith(`${lowerOriginal}_`) ||
		lowerCandidate.startsWith(`${lowerOriginal}.`) ||
		lowerCandidate.endsWith(`-${lowerOriginal}`) ||
		lowerCandidate.endsWith(`_${lowerOriginal}`) ||
		lowerCandidate.includes(lowerOriginal)
	) {
		return false;
	}

	if (
		lowerDesc.includes(`middleware for ${lowerOriginal}`) ||
		lowerDesc.includes(`plugin for ${lowerOriginal}`) ||
		lowerDesc.includes(`adapter for ${lowerOriginal}`) ||
		lowerDesc.includes(`wrapper for ${lowerOriginal}`) ||
		lowerDesc.includes(`extension for ${lowerOriginal}`) ||
		lowerDesc.includes(`${lowerOriginal} middleware`) ||
		lowerDesc.includes(`${lowerOriginal} plugin`)
	) {
		return false;
	}

	return true;
}

export async function handleNpmAlternatives(args: {
	packages: string[];
	ignoreCache?: boolean;
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			return createEmptyArrayErrorResponse('npmAlternatives');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let originalPackageName = '';
				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						originalPackageName = pkgInput.slice(0, atIdx);
					} else {
						originalPackageName = pkgInput;
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput),
						packageName: 'unknown_package_input',
						status: 'error' as const,
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!isValidNpmPackageName(originalPackageName)) {
					return {
						packageInput: pkgInput,
						packageName: originalPackageName,
						status: 'error' as const,
						error: 'Invalid package name format',
						data: null,
						message: `The package name "${originalPackageName}" is invalid/malformed.`,
					};
				}

				if (!originalPackageName) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
					};
				}

				const cacheKey = generateCacheKey('handleNpmAlternatives', originalPackageName);
				const cachedResult = args.ignoreCache ? undefined : cacheGet<any>(cacheKey);

				if (cachedResult) {
					return {
						...cachedResult,
						packageInput: pkgInput,
						packageName: originalPackageName,
						status: `${cachedResult.status}_cache` as const,
						message: `${cachedResult.message} (from cache)`,
					};
				}

				try {
					let originalPackageKeywords: string[] = [];
					let originalPackageDownloads = 0;

					try {
						const pkgManifestResponse = await fetchWithRetry(
							`${NPM_REGISTRY_URL}/${encodeURIComponent(originalPackageName)}/latest`,
						);
						if (pkgManifestResponse.ok) {
							const pkgManifest = (await pkgManifestResponse.json()) as any;
							if (Array.isArray(pkgManifest.keywords)) {
								originalPackageKeywords = pkgManifest.keywords;
							}
						}
					} catch {
						// Optional manifest retrieval failure
					}

					try {
						const dlResponse = await fetchWithRetry(
							`https://api.npmjs.org/downloads/point/last-month/${originalPackageName}`,
						);
						if (dlResponse.ok) {
							originalPackageDownloads =
								((await dlResponse.json()) as DownloadCount).downloads || 0;
						}
					} catch (e) {
						console.debug(
							`Failed to fetch downloads for original package ${originalPackageName}: ${e}`,
						);
					}

					const originalPackageStats = {
						name: originalPackageName,
						monthlyDownloads: originalPackageDownloads,
						keywords: originalPackageKeywords,
					};

					const KNOWN_ALTERNATIVES_MAP: Record<string, string[]> = {
						express: ['fastify', 'koa', 'hono', 'restify', 'nestjs'],
						lodash: ['ramda', 'remeda', 'radash', 'underscore'],
						moment: ['dayjs', 'date-fns', 'luxon'],
						request: ['axios', 'node-fetch', 'got', 'ky', 'superagent'],
						react: ['preact', 'vue', 'svelte', 'solid-js'],
						vue: ['react', 'svelte', 'solid-js', 'preact'],
						jest: ['vitest', 'mocha', 'ava'],
						axios: ['got', 'ky', 'node-fetch', 'superagent'],
						chalk: ['kleur', 'colorette', 'picocolors', 'ansis'],
						commander: ['yargs', 'cac', 'clipanion'],
						winston: ['pino', 'bunyan', 'loglevel'],
						mongoose: ['prisma', 'typeorm', 'drizzle-orm', 'sequelize'],
						webpack: ['vite', 'esbuild', 'rollup', 'parcel', 'turbopack'],
					};

					let validAlternativesRaw: any[] = [];
					const pkgLower = originalPackageName.toLowerCase();
					const knownCandidates = Object.hasOwn(KNOWN_ALTERNATIVES_MAP, pkgLower)
						? KNOWN_ALTERNATIVES_MAP[pkgLower]
						: undefined;

					if (Array.isArray(knownCandidates) && knownCandidates.length > 0) {
						try {
							const knownResponse = await fetchWithRetry(
								`${NPM_REGISTRY_URL}/-/v1/search?text=${encodeURIComponent(knownCandidates.join(' '))}&size=20`,
							);
							if (knownResponse.ok) {
								const knownData = (await knownResponse.json()) as NpmSearchResponse;
								validAlternativesRaw = (knownData.objects || []).filter(
									(alt) =>
										knownCandidates.includes(alt.package.name.toLowerCase()) &&
										alt.package.name.toLowerCase() !== originalPackageName.toLowerCase(),
								);
							}
						} catch {
							// Known candidate search failure fallback
						}
					}

					if (validAlternativesRaw.length === 0) {
						const genericKeywords = originalPackageKeywords.filter(
							(kw) =>
								kw.toLowerCase() !== originalPackageName.toLowerCase() &&
								!kw.toLowerCase().includes(originalPackageName.toLowerCase()) &&
								kw.length > 2,
						);

						const domainKeywords = genericKeywords.filter(
							(kw) =>
								![
									'mobile',
									'ionic',
									'component',
									'components',
									'ui',
									'css',
									'react',
									'vue',
									'angular',
									'stencil',
									'storybook',
									'icon',
									'icons',
								].includes(kw.toLowerCase()),
						);

						const selectedKeywords = domainKeywords.length > 0 ? domainKeywords : genericKeywords;

						let searchQuery = originalPackageName;
						if (selectedKeywords.length >= 2) {
							searchQuery = selectedKeywords.slice(0, 3).join(' ');
						} else if (selectedKeywords.length === 1) {
							searchQuery = selectedKeywords[0];
						}

						const searchResponse = await fetchWithRetry(
							`${NPM_REGISTRY_URL}/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=30`,
						);

						if (!searchResponse.ok) {
							const errorResult = {
								packageInput: pkgInput,
								packageName: originalPackageName,
								status: 'error' as const,
								error: `Failed to search for alternatives: ${searchResponse.status} ${searchResponse.statusText}`,
								data: null,
								message: 'Could not perform search for alternatives.',
							};
							return errorResult;
						}

						const searchData = (await searchResponse.json()) as NpmSearchResponse;
						const alternativePackagesRaw = searchData.objects || [];

						validAlternativesRaw = alternativePackagesRaw.filter((alt) =>
							isAlternativeCandidate(
								alt.package.name,
								alt.package.description || '',
								originalPackageName,
							),
						);

						if (validAlternativesRaw.length === 0 && searchQuery !== originalPackageName) {
							try {
								const fallbackResponse = await fetchWithRetry(
									`${NPM_REGISTRY_URL}/-/v1/search?text=${encodeURIComponent(
										originalPackageName,
									)}&size=30`,
								);
								if (fallbackResponse.ok) {
									const fallbackData = (await fallbackResponse.json()) as NpmSearchResponse;
									validAlternativesRaw = (fallbackData.objects || []).filter((alt) =>
										isAlternativeCandidate(
											alt.package.name,
											alt.package.description || '',
											originalPackageName,
										),
									);
								}
							} catch {
								// Fallback failure
							}
						}
					}

					if (validAlternativesRaw.length === 0) {
						const resultNoAlternatives = {
							packageInput: pkgInput,
							packageName: originalPackageName,
							status: 'no_alternatives_found' as const,
							error: null,
							data: { originalPackageStats, alternatives: [] },
							message: `No significant alternatives found for ${originalPackageName} based on search.`,
						};
						cacheSet(cacheKey, resultNoAlternatives, CACHE_TTL_MEDIUM);
						return resultNoAlternatives;
					}

					const alternativesData = await Promise.all(
						validAlternativesRaw.slice(0, 5).map(async (alt) => {
							let altDownloads = 0;
							try {
								const altDlResponse = await fetchWithRetry(
									`https://api.npmjs.org/downloads/point/last-month/${alt.package.name}`,
								);
								if (altDlResponse.ok) {
									altDownloads = ((await altDlResponse.json()) as DownloadCount).downloads || 0;
								}
							} catch (e) {
								console.debug(
									`Failed to fetch downloads for alternative ${alt.package.name}: ${e}`,
								);
							}

							return {
								name: alt.package.name,
								description: alt.package.description || null,
								version: alt.package.version,
								monthlyDownloads: altDownloads,
								score: alt.score.final,
								repositoryUrl: alt.package.links?.repository || null,
								keywords: alt.package.keywords || [],
							};
						}),
					);

					const successResult = {
						packageInput: pkgInput,
						packageName: originalPackageName,
						status: 'success' as const,
						error: null,
						data: {
							originalPackageStats: originalPackageStats,
							alternatives: alternativesData,
						},
						message: `Found ${alternativesData.length} alternative(s) for ${originalPackageName}.`,
					};
					cacheSet(cacheKey, successResult, CACHE_TTL_MEDIUM);
					return successResult;
				} catch (error) {
					const errorResult = {
						packageInput: pkgInput,
						packageName: originalPackageName,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while finding alternatives for ${originalPackageName}.`,
					};
					return errorResult; // Do not cache general errors
				}
			}),
		);

		const finalResponse = {
			queryPackages: args.packages,
			results: processedResults,
		};

		const responseJson = JSON.stringify(finalResponse, null, 2);
		return { content: [{ type: 'text', text: responseJson }], isError: false };
	} catch (error) {
		const errorResponse = JSON.stringify(
			{
				queryPackages: args.packages,
				results: [],
				error: `General error finding alternatives: ${error instanceof Error ? error.message : 'Unknown error'}`,
			},
			null,
			2,
		);
		return {
			content: [{ type: 'text', text: errorResponse }],
			isError: true,
		};
	}
}
export { createServer };
export default createServer;

// STDIO compatibility for backward compatibility
async function main() {
	// Create server with empty configuration
	const server = createServer({
		config: {},
	});

	// Start receiving messages on stdin and sending messages on stdout
	const transport = new StdioServerTransport();
	await server.connect(transport);

	process.stdin.on('close', () => {
		server.close();
	});

	// Handle uncaught errors
	process.on('uncaughtException', (error) => {
		console.error('Fatal error:', error);
		server.close();
		process.exit(1);
	});

	process.on('unhandledRejection', (error) => {
		console.error('Unhandled rejection:', error);
		server.close();
		process.exit(1);
	});
}

// Type guard for NpmPackageVersionSchema
function isNpmPackageVersionData(data: unknown): data is z.infer<typeof NpmPackageVersionSchema> {
	try {
		const result = NpmPackageVersionSchema.safeParse(data);
		if (!result.success) {
			console.error(
				'isNpmPackageVersionData validation failed:',
				JSON.stringify(result.error.issues, null, 2),
			);
		}
		return result.success;
	} catch {
		// This catch block might not be strictly necessary with safeParse but kept for safety
		// console.error("isNpmPackageVersionData validation failed unexpectedly:", e);
		return false;
	}
}

// Run STDIO server when executed directly (for backward compatibility)
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
	main().catch((error) => {
		console.error('Server error:', error);
		process.exit(1);
	});
}
