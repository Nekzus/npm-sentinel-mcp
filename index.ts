#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { z } from 'zod';

// Cache configuration
const CACHE_TTL_SHORT = 15 * 60 * 1000; // 15 minutes
const CACHE_TTL_MEDIUM = 60 * 60 * 1000; // 1 hour
const CACHE_TTL_LONG = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_TTL_VERY_LONG = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500; // Max number of items in cache

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

const apiCache = new Map<string, CacheEntry<any>>();

function generateCacheKey(
	toolName: string,
	...args: (string | number | boolean | undefined | null)[]
): string {
	// Simple key generation, ensure consistent order and stringification of args
	return `${toolName}:${args.map((arg) => String(arg)).join(':')}`;
}

function cacheGet<T>(key: string): T | undefined {
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

// Zod schemas for npm package data
export const NpmMaintainerSchema = z
	.object({
		name: z.string(),
		email: z.string().optional(),
		url: z.string().optional(),
	})
	.passthrough();

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
					.passthrough(),
			])
			.optional(),
		license: z.string().optional(),
		repository: z
			.object({
				type: z.string().optional(),
				url: z.string().optional(),
			})
			.passthrough()
			.optional(),
		bugs: z
			.object({
				url: z.string().optional(),
			})
			.passthrough()
			.optional(),
		homepage: z.string().optional(),
		dependencies: z.record(z.string()).optional(),
		devDependencies: z.record(z.string()).optional(),
		peerDependencies: z.record(z.string()).optional(),
		types: z.string().optional(),
		typings: z.string().optional(),
		dist: z
			.object({ shasum: z.string().optional(), tarball: z.string().optional() })
			.passthrough()
			.optional(),
	})
	.passthrough();

export const NpmPackageInfoSchema = z
	.object({
		name: z.string(),
		'dist-tags': z.record(z.string()),
		versions: z.record(NpmPackageVersionSchema),
		time: z.record(z.string()).optional(),
		repository: z
			.object({
				type: z.string().optional(),
				url: z.string().optional(),
			})
			.passthrough()
			.optional(),
		bugs: z
			.object({
				url: z.string().optional(),
			})
			.passthrough()
			.optional(),
		homepage: z.string().optional(),
		maintainers: z.array(NpmMaintainerSchema).optional(),
	})
	.passthrough();

export const NpmPackageDataSchema = z.object({
	name: z.string(),
	version: z.string(),
	description: z.string().optional(),
	license: z.string().optional(),
	dependencies: z.record(z.string()).optional(),
	devDependencies: z.record(z.string()).optional(),
	peerDependencies: z.record(z.string()).optional(),
	types: z.string().optional(),
	typings: z.string().optional(),
});

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

// Updated interface for npms.io response
interface NpmsApiResponse {
	analyzedAt: string;
	collected: {
		metadata: {
			name: string;
			version: string;
			description?: string;
		};
		npm: {
			downloads: Array<{
				from: string;
				to: string;
				count: number;
			}>;
			starsCount: number;
		};
		github?: {
			starsCount: number;
			forksCount: number;
			subscribersCount: number;
			issues: {
				count: number;
				openCount: number;
			};
		};
	};
	score: {
		final: number;
		detail: {
			quality: number;
			popularity: number;
			maintenance: number;
		};
	};
}

function isValidNpmsResponse(data: unknown): data is NpmsApiResponse {
	if (typeof data !== 'object' || data === null) {
		console.debug('Response is not an object or is null');
		return false;
	}

	const response = data as Partial<NpmsApiResponse>;

	// Check score structure
	if (
		!response.score ||
		typeof response.score !== 'object' ||
		!('final' in response.score) ||
		typeof response.score.final !== 'number' ||
		!('detail' in response.score) ||
		typeof response.score.detail !== 'object'
	) {
		console.debug('Invalid score structure');
		return false;
	}

	// Check score detail metrics
	const detail = response.score.detail;
	if (
		typeof detail.quality !== 'number' ||
		typeof detail.popularity !== 'number' ||
		typeof detail.maintenance !== 'number'
	) {
		console.debug('Invalid score detail metrics');
		return false;
	}

	// Check collected data structure
	if (
		!response.collected ||
		typeof response.collected !== 'object' ||
		!response.collected.metadata ||
		typeof response.collected.metadata !== 'object' ||
		typeof response.collected.metadata.name !== 'string' ||
		typeof response.collected.metadata.version !== 'string'
	) {
		console.debug('Invalid collected data structure');
		return false;
	}

	// Check npm data
	if (
		!response.collected.npm ||
		typeof response.collected.npm !== 'object' ||
		!Array.isArray(response.collected.npm.downloads) ||
		typeof response.collected.npm.starsCount !== 'number'
	) {
		console.debug('Invalid npm data structure');
		return false;
	}

	// Optional github data check
	if (response.collected.github) {
		if (
			typeof response.collected.github !== 'object' ||
			typeof response.collected.github.starsCount !== 'number' ||
			typeof response.collected.github.forksCount !== 'number' ||
			typeof response.collected.github.subscribersCount !== 'number' ||
			!response.collected.github.issues ||
			typeof response.collected.github.issues !== 'object' ||
			typeof response.collected.github.issues.count !== 'number' ||
			typeof response.collected.github.issues.openCount !== 'number'
		) {
			console.debug('Invalid github data structure');
			return false;
		}
	}

	return true;
}

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
	.passthrough();

// Type inference
export type NpmPackageInfo = z.infer<typeof NpmPackageInfoSchema>;
export type NpmPackageData = z.infer<typeof NpmPackageDataSchema>;
export type BundlephobiaData = z.infer<typeof BundlephobiaDataSchema>;
export type NpmDownloadsData = z.infer<typeof NpmDownloadsDataSchema>;

// Logger function that uses stderr - only for critical errors
const log = (...args: any[]) => {
	// Filter out server status messages
	const message = args[0];
	if (
		typeof message === 'string' &&
		(!message.startsWith('[Server]') || message.includes('error') || message.includes('Error'))
	) {
		console.error(...args);
	}
};

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
		return NpmPackageDataSchema.parse(data) !== null;
	} catch {
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
		return NpmDownloadsDataSchema.parse(data) !== null;
	} catch {
		return false;
	}
}

export async function handleNpmVersions(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
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
				const cachedData = cacheGet<any>(cacheKey); // Using any for the diverse structure from this endpoint

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
					const response = await fetch(`https://registry.npmjs.org/${name}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
				});

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

interface NpmLatestVersionResponse {
	version: string;
	description?: string;
	author?: {
		name?: string;
	};
	license?: string;
	homepage?: string;
}

export async function handleNpmLatest(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
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
				const cachedData = cacheGet<any>(cacheKey); // Using any for the diverse structure from this endpoint

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
					const response = await fetch(`https://registry.npmjs.org/${name}/${versionTag}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
				});

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

				const packageNameForOutput = version === 'latest' ? name : `${name}@${version}`;

				// Note: The cache key should ideally use the *resolved* version if 'latest' is input.
				// However, to get the resolved version, we need an API call. For simplicity in this step,
				// we'll cache based on the input version string. This means 'latest' will be cached as 'latest'.
				// A more advanced caching would fetch resolved version first if 'latest' is given.
				const cacheKey = generateCacheKey('handleNpmDeps', name, version);
				const cachedData = cacheGet<any>(cacheKey);

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
					const response = await fetch(`https://registry.npmjs.org/${name}/${version}`, {
						headers: {
							Accept: 'application/json',
							'User-Agent': 'NPM-Sentinel-MCP',
						},
					});

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

					const depData = {
						dependencies: mapDeps(rawData.dependencies),
						devDependencies: mapDeps(rawData.devDependencies),
						peerDependencies: mapDeps(rawData.peerDependencies),
					};

					const actualVersion = rawData.version || version; // Use version from response if available
					const finalPackageName = `${name}@${actualVersion}`;

					// Store with the actual resolved package name if 'latest' was used
					cacheSet(cacheKey, { depData, packageNameForCache: finalPackageName }, CACHE_TTL_MEDIUM);

					return {
						package: finalPackageName,
						status: 'success',
						error: null,
						data: depData,
						message: `Dependencies for ${finalPackageName}`,
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

export async function handleNpmTypes(args: { packages: string[] }): Promise<CallToolResult> {
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

				const packageNameForOutput = version === 'latest' ? name : `${name}@${version}`;

				// As with handleNpmDeps, we cache based on the input version string for simplicity.
				const cacheKey = generateCacheKey('handleNpmTypes', name, version);
				const cachedData = cacheGet<any>(cacheKey);

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
					const response = await fetch(`https://registry.npmjs.org/${name}/${version}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
				});

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
						const typesResponse = await fetch(
							`https://registry.npmjs.org/${typesPackageName}/latest`,
							{
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
							},
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

				const bundlephobiaQuery = version === 'latest' ? name : `${name}@${version}`;
				const packageNameForOutput = bundlephobiaQuery;

				const cacheKey = generateCacheKey('handleNpmSize', bundlephobiaQuery);
				const cachedData = cacheGet<any>(cacheKey);

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
					const response = await fetch(
						`https://bundlephobia.com/api/size?package=${bundlephobiaQuery}`,
						{
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
						},
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

export async function handleNpmVulnerabilities(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let version: string | undefined = undefined;
				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						version = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
					}
				} else if (typeof pkgInput === 'object' && pkgInput !== null) {
					name = (pkgInput as any).name;
					version = (pkgInput as any).version;
				}

				const packageNameForOutput = version ? `${name}@${version}` : name;
				const cacheKey = generateCacheKey('handleNpmVulnerabilities', name, version || 'all');
				const cachedData = cacheGet<any>(cacheKey);

				if (cachedData) {
					return {
						package: packageNameForOutput,
						versionQueried: version || null,
						status: 'success_cache',
						vulnerabilities: cachedData.vulnerabilities,
						message: `${cachedData.message} (from cache)`,
					};
				}

				const osvBody: any = {
					package: {
						name,
						ecosystem: 'npm',
					},
				};
				if (version) {
					osvBody.version = version;
				}

				const response = await fetch('https://api.osv.dev/v1/query', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(osvBody),
				});

				const queryVersionSpecified = !!version;

				if (!response.ok) {
					const errorResult = {
						package: packageNameForOutput,
						versionQueried: version || null,
						status: 'error' as const,
						error: `OSV API Error: ${response.statusText}`,
						vulnerabilities: [],
					};
					// Do not cache error responses from OSV API as they might be temporary
					return errorResult;
				}

				const data = (await response.json()) as {
					vulns?: Array<{
						id?: string;
						summary: string;
						severity?: string | { type?: string; score?: number };
						references?: Array<{ url: string }>;
						affected?: Array<{
							package?: { ecosystem: string; name: string };
							ranges?: Array<{
								type: string;
								events: Array<{ introduced?: string; fixed?: string; limit?: string }>;
							}>;
							versions?: string[];
						}>;
					}>;
				};

				const vulns = data.vulns || [];
				let message: string;
				if (vulns.length === 0) {
					message = `No known vulnerabilities found${queryVersionSpecified ? ' for the specified version' : ''}.`;
				} else {
					message = `${vulns.length} vulnerability(ies) found${queryVersionSpecified ? ' for the specified version' : ''}.`;
				}

				const processedVulns = vulns.map((vuln) => {
					const sev =
						typeof vuln.severity === 'object'
							? vuln.severity.type || 'Unknown'
							: vuln.severity || 'Unknown';
					const refs = vuln.references ? vuln.references.map((r) => r.url) : [];
					const affectedRanges: any[] = [];
					const affectedVersionsListed: string[] = [];

					const vulnerabilityDetails: any = {
						summary: vuln.summary,
						severity: sev,
						references: refs,
					};

					if (vuln.affected && vuln.affected.length > 0) {
						const lifecycle: { introduced?: string; fixed?: string } = {};
						const firstAffectedEvents = vuln.affected[0]?.ranges?.[0]?.events;
						if (firstAffectedEvents) {
							const introducedEvent = firstAffectedEvents.find((e) => e.introduced);
							const fixedEvent = firstAffectedEvents.find((e) => e.fixed);
							if (introducedEvent?.introduced) lifecycle.introduced = introducedEvent.introduced;
							if (fixedEvent?.fixed) lifecycle.fixed = fixedEvent.fixed;
						}
						if (Object.keys(lifecycle).length > 0) {
							vulnerabilityDetails.lifecycle = lifecycle;
							if (queryVersionSpecified && version && lifecycle.fixed) {
								const queriedParts = version.split('.').map(Number);
								const fixedParts = lifecycle.fixed.split('.').map(Number);
								let isFixedDecision = false;
								const maxLength = Math.max(queriedParts.length, fixedParts.length);

								for (let i = 0; i < maxLength; i++) {
									const qp = queriedParts[i] || 0;
									const fp = fixedParts[i] || 0;

									if (fp < qp) {
										isFixedDecision = true;
										break;
									}
									if (fp > qp) {
										isFixedDecision = false;
										break;
									}
									if (i === maxLength - 1) {
										isFixedDecision = fixedParts.length <= queriedParts.length;
									}
								}
								vulnerabilityDetails.isFixedInQueriedVersion = isFixedDecision;
							}
						}
					}

					if (!queryVersionSpecified && vuln.affected) {
						for (const aff of vuln.affected) {
							if (aff.ranges) {
								for (const range of aff.ranges) {
									affectedRanges.push({ type: range.type, events: range.events });
								}
							}
							if (aff.versions && aff.versions.length > 0) {
								affectedVersionsListed.push(...aff.versions);
							}
						}
						if (affectedRanges.length > 0) {
							vulnerabilityDetails.affectedRanges = affectedRanges;
						}
						if (affectedVersionsListed.length > 0) {
							vulnerabilityDetails.affectedVersionsListed = affectedVersionsListed;
						}
					}
					return vulnerabilityDetails;
				});

				const resultToCache = {
					vulnerabilities: processedVulns,
					message: message,
				};
				cacheSet(cacheKey, resultToCache, CACHE_TTL_MEDIUM);

		return {
					package: packageNameForOutput,
					versionQueried: version || null,
					status: 'success' as const,
					vulnerabilities: processedVulns,
					message: message,
				};
			}),
		);

		const responseJson = JSON.stringify({ results: processedResults }, null, 2);

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
				const cachedData = cacheGet<any>(cacheKey);

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
					const response = await fetch(`https://api.npmjs.org/downloads/point/${period}/${name}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
				});

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

export async function handleNpmCompare(args: { packages: string[] }): Promise<CallToolResult> {
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
				const cachedData = cacheGet<any>(cacheKey);

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
					// Fetch package version details from registry
					const pkgResponse = await fetch(`https://registry.npmjs.org/${name}/${versionTag}`);
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
						const downloadsResponse = await fetch(
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
						const fullPkgInfoResponse = await fetch(`https://registry.npmjs.org/${name}`);
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

// Function to get package quality metrics
export async function handleNpmQuality(args: {
	packages: string[];
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
					name = atIdx > 0 ? pkgInput.slice(0, atIdx) : pkgInput; // Version is ignored by npms.io API endpoint for the main query
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

				try {
					const response = await fetch(
						`https://api.npms.io/v2/package/${encodeURIComponent(name)}`,
						{
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
						},
					);

				if (!response.ok) {
						let errorMsg = `Failed to fetch quality data: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name} not found on npms.io.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: errorMsg,
							data: null,
							message: `Could not retrieve quality information for ${name}.`,
						};
					}

				const rawData = await response.json();

				if (!isValidNpmsResponse(rawData)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: 'Invalid or incomplete response from npms.io API for quality data',
							data: null,
							message: `Received malformed quality data for ${name}.`,
						};
					}

					const { score, collected, analyzedAt } = rawData;
					const qualityScore = score.detail.quality;

					const qualityData = {
						analyzedAt: analyzedAt,
						versionInScore: collected.metadata.version,
						qualityScore: qualityScore,
						// Detailed sub-metrics like tests, coverage, linting, types are no longer directly provided
						// by the npms.io v2 API in the same way. The overall quality score is the primary metric.
					};

				return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: qualityData,
						message: `Successfully fetched quality score for ${name} (version analyzed: ${collected.metadata.version}).`,
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

export async function handleNpmMaintenance(args: { packages: string[] }): Promise<CallToolResult> {
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

				try {
					const response = await fetch(
						`https://api.npms.io/v2/package/${encodeURIComponent(name)}`,
						{
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
						},
					);

				if (!response.ok) {
						let errorMsg = `Failed to fetch maintenance data: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name} not found on npms.io.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: errorMsg,
							data: null,
							message: `Could not retrieve maintenance information for ${name}.`,
						};
					}

				const rawData = await response.json();

				if (!isValidNpmsResponse(rawData)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: 'Invalid or incomplete response from npms.io API for maintenance data',
							data: null,
							message: `Received malformed maintenance data for ${name}.`,
						};
					}

					const { score, collected, analyzedAt } = rawData;
					const maintenanceScoreValue = score.detail.maintenance;

					const maintenanceData = {
						analyzedAt: analyzedAt,
						versionInScore: collected.metadata.version,
						maintenanceScore: maintenanceScoreValue,
					};

				return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: maintenanceData,
						message: `Successfully fetched maintenance score for ${name} (version analyzed: ${collected.metadata.version}).`,
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

				if (!name) {
				return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				try {
					const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);

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

		return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: {
							maintainers: maintainers,
							maintainersCount: maintainers.length,
						},
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

export async function handleNpmScore(args: { packages: string[] }): Promise<CallToolResult> {
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

				if (!name) {
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error' as const,
						error: 'Empty package name derived from input',
						data: null,
					};
				}

				try {
					const response = await fetch(
						`https://api.npms.io/v2/package/${encodeURIComponent(name)}`,
					);

					if (!response.ok) {
						let errorMsg = `Failed to fetch package score: ${response.status} ${response.statusText}`;
						if (response.status === 404) {
							errorMsg = `Package ${name} not found on npms.io.`;
						}
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: errorMsg,
							data: null,
						};
				}

				const rawData = await response.json();

				if (!isValidNpmsResponse(rawData)) {
					return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
						error: 'Invalid or incomplete response from npms.io API',
							data: null,
					};
				}

					const { score, collected, analyzedAt } = rawData;
				const { detail } = score;

					// Calculate total downloads for the last month from the typically first entry in downloads array
					const lastMonthDownloads =
						collected.npm?.downloads?.find((d) => {
							// Heuristic: find a download period that is roughly 30 days
							const from = new Date(d.from);
							const to = new Date(d.to);
							const diffTime = Math.abs(to.getTime() - from.getTime());
							const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
							return diffDays >= 28 && diffDays <= 31; // Common range for monthly data
						})?.count ||
						collected.npm?.downloads?.[0]?.count ||
						0;

					const scoreData = {
						analyzedAt: analyzedAt,
						versionInScore: collected.metadata.version,
						score: {
							final: score.final,
							detail: {
								quality: detail.quality,
								popularity: detail.popularity,
								maintenance: detail.maintenance,
							},
						},
						packageInfoFromScore: {
							name: collected.metadata.name,
							version: collected.metadata.version,
							description: collected.metadata.description || null,
						},
						npmStats: {
							downloadsLastMonth: lastMonthDownloads,
							starsCount: collected.npm.starsCount,
						},
						githubStats: collected.github
							? {
									starsCount: collected.github.starsCount,
									forksCount: collected.github.forksCount,
									subscribersCount: collected.github.subscribersCount,
									issues: {
										count: collected.github.issues.count,
										openCount: collected.github.issues.openCount,
									},
								}
							: null,
					};

				return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: scoreData,
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

export async function handleNpmPackageReadme(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided to fetch READMEs.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let versionTag: string | undefined = undefined; // Explicitly undefined if not specified

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

				try {
					const response = await fetch(`https://registry.npmjs.org/${name}`);
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

					const versionToUse =
						versionTag === 'latest' ? packageInfo['dist-tags']?.latest : versionTag;

					if (!versionToUse || !packageInfo.versions || !packageInfo.versions[versionToUse]) {
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
					const readmeContent = versionData.readme || packageInfo.readme || null;
					const hasReadme = !!readmeContent;

					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionTag,
						versionFetched: versionToUse,
						status: 'success' as const,
						error: null,
						data: {
							readme: readmeContent,
							hasReadme: hasReadme,
						},
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
		return { content: [{ type: 'text', text: responseJson }], isError: false };
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
}): Promise<CallToolResult> {
	try {
		const query = args.query;
		const limit = args.limit || 10;
		if (limit < 1 || limit > 250) {
			// NPM API search limit is typically 250
			throw new Error('Limit must be between 1 and 250.');
		}

		const response = await fetch(
			`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`,
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

				try {
					const response = await fetch(`https://registry.npmjs.org/${name}/${versionTag}`);
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

interface GitHubRepoStats {
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	watchers_count: number;
	updated_at: string;
	created_at: string;
	has_wiki: boolean;
	default_branch: string;
	topics: string[];
}

// Repository statistics analyzer
export async function handleNpmRepoStats(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided for repository statistics analysis.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				// let versionTag: string | undefined = undefined; // Version not directly used for repo URL but good for consistency if needed later

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						// versionTag = pkgInput.slice(atIdx + 1);
					} else {
						name = pkgInput;
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

				try {
					// Fetch package info from npm to find the repository URL (use /latest to get common package data)
					const npmResponse = await fetch(`https://registry.npmjs.org/${name}/latest`);
				if (!npmResponse.ok) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: `Failed to fetch npm info for ${name}: ${npmResponse.status} ${npmResponse.statusText}`,
							data: null,
							message: `Could not retrieve NPM package data for ${name}.`,
						};
					}
					const npmData = await npmResponse.json();
					// Use isNpmPackageVersionData as /latest returns a version-specific structure
					if (!isNpmPackageVersionData(npmData)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: 'Invalid NPM package data format received.',
							data: null,
							message: `Malformed NPM package data for ${name}.`,
						};
					}

					const repoUrl = npmData.repository?.url;
					if (!repoUrl) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'no_repo_found' as const,
							error: null,
							data: null,
							message: `No repository URL found in package data for ${name}.`,
						};
					}

					const githubMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
					if (!githubMatch) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'not_github_repo' as const,
							error: null,
							data: { repositoryUrl: repoUrl }, // Provide the non-GitHub URL
							message: `Repository URL found (${repoUrl}) is not a standard GitHub URL.`,
						};
					}

					const [, owner, repo] = githubMatch;
					const githubRepoApiUrl = `https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, '')}`;

					const githubResponse = await fetch(githubRepoApiUrl, {
					headers: {
						Accept: 'application/vnd.github.v3+json',
							'User-Agent': 'NPM-Sentinel-MCP', // Updated User-Agent
							// Add Authorization header if a token is available and rate limits are an issue
							// 'Authorization': `token YOUR_GITHUB_TOKEN`
					},
				});

				if (!githubResponse.ok) {
						return {
							packageInput: pkgInput,
							packageName: name,
							status: 'error' as const,
							error: `Failed to fetch GitHub repo stats for ${owner}/${repo}: ${githubResponse.status} ${githubResponse.statusText}`,
							data: { githubRepoUrl: githubRepoApiUrl },
							message: `Could not retrieve GitHub repository statistics from ${githubRepoApiUrl}.`,
						};
					}

					const githubData = (await githubResponse.json()) as GitHubRepoStats;

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success' as const,
						error: null,
						data: {
							githubRepoUrl: `https://github.com/${owner}/${repo.replace(/\.git$/, '')}`,
							stars: githubData.stargazers_count,
							forks: githubData.forks_count,
							openIssues: githubData.open_issues_count,
							watchers: githubData.watchers_count, // Note: 'watchers_count' might be subscribers on GitHub API
							createdAt: githubData.created_at,
							updatedAt: githubData.updated_at,
							defaultBranch: githubData.default_branch,
							hasWiki: githubData.has_wiki,
							topics: githubData.topics || [],
						},
						message: 'GitHub repository statistics fetched successfully.',
					};
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

interface NpmDependencies {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

interface DeprecatedDependency {
	name: string;
	version: string;
	message: string;
}

interface GithubRelease {
	tag_name?: string;
	name?: string;
	published_at?: string;
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

export async function handleNpmDeprecated(args: { packages: string[] }): Promise<CallToolResult> {
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

				const initialPackageNameForOutput = version === 'latest' ? name : `${name}@${version}`;

				try {
					const mainPkgResponse = await fetch(`https://registry.npmjs.org/${name}`);
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

					let versionToFetch = version;
					if (version === 'latest') {
						versionToFetch = mainPkgData['dist-tags']?.latest || 'latest';
						if (versionToFetch === 'latest' && !mainPkgData.versions?.[versionToFetch]) {
							// If 'latest' tag is missing or points to a non-existent version, try to get the highest semver version
							const availableVersions = Object.keys(mainPkgData.versions || {});
							if (availableVersions.length > 0) {
								// A more robust semver sort would be better here, but for simplicity:
								versionToFetch = availableVersions.sort().pop() || 'latest';
							}
						}
					}

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

					const processDependencies = async (deps: Record<string, string> | undefined) => {
						if (!deps) return [];
						const depChecks = Object.entries(deps).map(async ([depName, depSemVer]) => {
							try {
								// For dependencies, we check their 'latest' tag to see if the *package itself* is deprecated,
								// not a specific version. A more granular check could be to resolve semver and check that specific version.
								const depResponse = await fetch(`https://registry.npmjs.org/${depName}`);
								if (!depResponse.ok) {
									return {
										name: depName,
										version: depSemVer,
										isDeprecated: false, // Assume not deprecated if fetch fails
										deprecationMessage: 'Could not fetch dependency info',
									};
								}
								const depData = (await depResponse.json()) as NpmRegistryResponse;
								const latestDepVersionTag = depData['dist-tags']?.latest;
								const latestDepVersionInfo = latestDepVersionTag
									? depData.versions?.[latestDepVersionTag]
									: undefined;

								return {
									name: depName,
									version: depSemVer,
									isDeprecated: !!latestDepVersionInfo?.deprecated,
									deprecationMessage: latestDepVersionInfo?.deprecated || null,
								};
							} catch (error) {
								return {
									name: depName,
									version: depSemVer,
									isDeprecated: false, // Assume not deprecated on error
									deprecationMessage:
										error instanceof Error ? error.message : 'Unknown error checking dependency',
								};
							}
						});
						return Promise.all(depChecks);
					};

					const directDeps = await processDependencies(versionInfo.dependencies);
					const devDeps = await processDependencies(versionInfo.devDependencies);
					const peerDeps = await processDependencies(versionInfo.peerDependencies);

					return {
						package: finalPackageNameForOutput,
						status: 'success',
						error: null,
						data: {
							isPackageDeprecated,
							packageDeprecationMessage,
							dependencies: {
								direct: directDeps,
								development: devDeps,
								peer: peerDeps,
							},
						},
						message: `Deprecation status for ${finalPackageNameForOutput} and its dependencies.`,
					};
				} catch (error) {
					return {
						package: initialPackageNameForOutput, // Use initial name as resolution might have failed
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
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided for changelog analysis.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let name = '';
				let versionQueried: string | undefined = undefined;

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

				try {
					const npmResponse = await fetch(`https://registry.npmjs.org/${name}`);
				if (!npmResponse.ok) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'error' as const,
							error: `Failed to fetch npm info for ${name}: ${npmResponse.status} ${npmResponse.statusText}`,
							data: null,
							message: `Could not retrieve NPM package data for ${name}.`,
						};
				}
				const npmData = await npmResponse.json();
				if (!isNpmPackageInfo(npmData)) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'error' as const,
							error: 'Invalid NPM package info data received',
							data: null,
							message: `Received malformed NPM package data for ${name}.`,
						};
					}

					const repositoryUrl = npmData.repository?.url;
					if (!repositoryUrl) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'no_repo_found' as const,
							error: null,
							data: null,
							message: `No repository URL found in package data for ${name}.`,
						};
					}

					const githubMatch = repositoryUrl.match(/github\.com[:\/]([^\/]+)\/([^\/.]+)/);
					if (!githubMatch) {
						return {
							packageInput: pkgInput,
							packageName: name,
							versionQueried: versionQueried,
							status: 'not_github_repo' as const,
							error: null,
							data: { repositoryUrl: repositoryUrl },
							message: `Repository URL (${repositoryUrl}) is not a standard GitHub URL.`,
						};
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

				for (const file of changelogFiles) {
					try {
							const rawChangelogUrl = `https://raw.githubusercontent.com/${owner}/${repoNameForUrl}/master/${file}`;
							const response = await fetch(rawChangelogUrl);
						if (response.ok) {
								changelogContent = await response.text();
								changelogSourceUrl = rawChangelogUrl;
								hasChangelogFile = true;
							break;
						}
					} catch (error) {
							console.debug(`Error fetching changelog file ${file} for ${name}: ${error}`);
						}
					}

					let githubReleases: any[] = [];
					try {
						const githubApiResponse = await fetch(
							`https://api.github.com/repos/${owner}/${repoNameForUrl}/releases?per_page=5`,
					{
						headers: {
							Accept: 'application/vnd.github.v3+json',
									'User-Agent': 'NPM-Sentinel-MCP',
						},
					},
				);
						if (githubApiResponse.ok) {
							const releasesData = (await githubApiResponse.json()) as GithubRelease[];
							githubReleases = releasesData.map((r) => ({
								tag_name: r.tag_name || null,
								name: r.name || null,
								published_at: r.published_at || null,
							}));
						}
					} catch (error) {
						console.debug(`Error fetching GitHub releases for ${name}: ${error}`);
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

					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionQueried,
						status: status,
						error: null,
						data: {
							repositoryUrl: repositoryUrl,
							changelogSourceUrl: changelogSourceUrl,
							changelogContent: changelogContent
								? `${changelogContent.split('\n').slice(0, 50).join('\n')}...`
								: null, // First 50 lines
							hasChangelogFile: hasChangelogFile,
							githubReleases: githubReleases,
							npmVersionHistory: npmVersionHistory,
						},
						message: message,
					};
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: name,
						versionQueried: versionQueried,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while analyzing changelog for ${name}.`,
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

export async function handleNpmAlternatives(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided to find alternatives.');
		}

		const processedResults = await Promise.all(
			packagesToProcess.map(async (pkgInput) => {
				let originalPackageName = '';
				let versionQueried: string | undefined = undefined;

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						originalPackageName = pkgInput.slice(0, atIdx);
						versionQueried = pkgInput.slice(atIdx + 1); // Version is not used for search query but recorded
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

				try {
					// Fetch alternatives using keywords of the original package (or the package name itself as a keyword)
					// For simplicity, we'll use the package name as the primary keyword query
					const searchResponse = await fetch(
						`https://registry.npmjs.org/-/v1/search?text=keywords:${encodeURIComponent(originalPackageName)}&size=10`,
					);
					if (!searchResponse.ok) {
						return {
							packageInput: pkgInput,
							packageName: originalPackageName,
							status: 'error' as const,
							error: `Failed to search for alternatives: ${searchResponse.status} ${searchResponse.statusText}`,
							data: null,
							message: 'Could not perform search for alternatives.',
						};
					}

					const searchData = (await searchResponse.json()) as NpmSearchResponse;
					const alternativePackagesRaw = searchData.objects || [];

					// Fetch download count for the original package
					let originalPackageDownloads = 0;
					try {
						const dlResponse = await fetch(
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

					// Placeholder for keywords for the original package - this might require another fetch or be part of initial data if available
					const originalPackageKeywords =
						alternativePackagesRaw.find((p) => p.package.name === originalPackageName)?.package
							.keywords || [];

					const originalPackageStats = {
						name: originalPackageName,
						monthlyDownloads: originalPackageDownloads,
						keywords: originalPackageKeywords,
					};

					if (
						alternativePackagesRaw.length === 0 ||
						(alternativePackagesRaw.length === 1 &&
							alternativePackagesRaw[0].package.name === originalPackageName)
					) {
						return {
							packageInput: pkgInput,
							packageName: originalPackageName,
							status: 'no_alternatives_found' as const,
							error: null,
							data: { originalPackageStats, alternatives: [] },
							message: `No significant alternatives found for ${originalPackageName} based on keyword search.`,
						};
					}

					const alternativesData = await Promise.all(
						alternativePackagesRaw
							.filter((alt) => alt.package.name !== originalPackageName) // Exclude the original package itself
							.slice(0, 5) // Limit to top 5 alternatives
							.map(async (alt) => {
								let altDownloads = 0;
								try {
									const altDlResponse = await fetch(
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

					return {
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
				} catch (error) {
					return {
						packageInput: pkgInput,
						packageName: originalPackageName,
						status: 'error' as const,
						error: error instanceof Error ? error.message : 'Unknown processing error',
						data: null,
						message: `An unexpected error occurred while finding alternatives for ${originalPackageName}.`,
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

// Create server instance
const server = new McpServer({
	name: 'npm-sentinel-mcp',
	version: '1.5.7',
});

// Add NPM tools
server.tool(
	'npmVersions',
	'Get all available versions of an NPM package',
	{
		packages: z.array(z.string()).describe('List of package names to get versions for'),
	},
	async (args, extra) => {
		return await handleNpmVersions(args);
	},
);

server.tool(
	'npmLatest',
	'Get the latest version and changelog of an NPM package',
	{
		packages: z.array(z.string()).describe('List of package names to get latest versions for'),
	},
	async (args, extra) => {
		return await handleNpmLatest(args);
	},
);

server.tool(
	'npmDeps',
	'Analyze dependencies and devDependencies of an NPM package',
	{
		packages: z.array(z.string()).describe('List of package names to analyze dependencies for'),
	},
	async (args) => {
		return await handleNpmDeps(args);
	},
);

server.tool(
	'npmTypes',
	'Check TypeScript types availability and version for a package',
	{
		packages: z.array(z.string()).describe('List of package names to check types for'),
	},
	async (args) => {
		return await handleNpmTypes(args);
	},
);

server.tool(
	'npmSize',
	'Get package size information including dependencies and bundle size',
	{
		packages: z.array(z.string()).describe('List of package names to get size information for'),
	},
	async (args) => {
		return await handleNpmSize(args);
	},
);

server.tool(
	'npmVulnerabilities',
	'Check for known vulnerabilities in packages',
	{
		packages: z.array(z.string()).describe('List of package names to check for vulnerabilities'),
	},
	async (args) => {
		return await handleNpmVulnerabilities(args);
	},
);

server.tool(
	'npmTrends',
	'Get download trends and popularity metrics for packages',
	{
		packages: z.array(z.string()).describe('List of package names to get trends for'),
		period: z
			.enum(['last-week', 'last-month', 'last-year'])
			.describe('Time period for trends. Options: "last-week", "last-month", "last-year"')
			.optional()
			.default('last-month'),
	},
	async (args) => {
		return await handleNpmTrends(args);
	},
);

server.tool(
	'npmCompare',
	'Compare multiple NPM packages based on various metrics',
	{
		packages: z.array(z.string()).describe('List of package names to compare'),
	},
	async (args) => {
		return await handleNpmCompare(args);
	},
);

server.tool(
	'npmMaintainers',
	'Get maintainers information for NPM packages',
	{
		packages: z.array(z.string()).describe('List of package names to get maintainers for'),
	},
	async (args) => {
		return await handleNpmMaintainers(args);
	},
);

server.tool(
	'npmScore',
	'Get consolidated package score based on quality, maintenance, and popularity metrics',
	{
		packages: z.array(z.string()).describe('List of package names to get scores for'),
	},
	async (args) => {
		return await handleNpmScore(args);
	},
);

server.tool(
	'npmPackageReadme',
	'Get the README content for NPM packages',
	{
		packages: z.array(z.string()).describe('List of package names to get READMEs for'),
	},
	async (args) => {
		return await handleNpmPackageReadme(args);
	},
);

server.tool(
	'npmSearch',
	'Search for NPM packages with optional limit',
	{
		query: z.string().describe('Search query for packages'),
		limit: z
			.number()
			.min(1)
			.max(50)
			.optional()
			.describe('Maximum number of results to return (default: 10)'),
	},
	async (args) => {
		return await handleNpmSearch(args);
	},
);

server.tool(
	'npmLicenseCompatibility',
	'Check license compatibility between multiple packages',
	{
		packages: z
			.array(z.string())
			.min(1)
			.describe('List of package names to check for license compatibility'),
	},
	async (args) => {
		return await handleNpmLicenseCompatibility(args);
	},
);

server.tool(
	'npmRepoStats',
	'Get repository statistics for NPM packages',
	{
		packages: z.array(z.string()).describe('List of package names to get repository stats for'),
	},
	async (args) => {
		return await handleNpmRepoStats(args);
	},
);

server.tool(
	'npmDeprecated',
	'Check if packages are deprecated',
	{
		packages: z.array(z.string()).describe('List of package names to check for deprecation'),
	},
	async (args) => {
		return await handleNpmDeprecated(args);
	},
);

server.tool(
	'npmChangelogAnalysis',
	'Analyze changelog and release history of packages',
	{
		packages: z.array(z.string()).describe('List of package names to analyze changelogs for'),
	},
	async (args) => {
		return await handleNpmChangelogAnalysis(args);
	},
);

server.tool(
	'npmAlternatives',
	'Find alternative packages with similar functionality',
	{
		packages: z.array(z.string()).describe('List of package names to find alternatives for'),
	},
	async (args) => {
		return await handleNpmAlternatives(args);
	},
);

server.tool(
	'npmQuality',
	'Analyze package quality metrics',
	{
		packages: z.array(z.string()).describe('List of package names to analyze'),
	},
	async (args) => {
		return await handleNpmQuality(args);
	},
);

server.tool(
	'npmMaintenance',
	'Analyze package maintenance metrics',
	{
		packages: z.array(z.string()).describe('List of package names to analyze'),
	},
	async (args) => {
		return await handleNpmMaintenance(args);
	},
);

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

// Type guard for NpmPackageVersionSchema
function isNpmPackageVersionData(data: unknown): data is z.infer<typeof NpmPackageVersionSchema> {
	try {
		// Use safeParse for type guards to avoid throwing errors on invalid data
		return NpmPackageVersionSchema.safeParse(data).success;
	} catch (e) {
		// This catch block might not be strictly necessary with safeParse but kept for safety
		// console.error("isNpmPackageVersionData validation failed unexpectedly:", e);
		return false;
	}
}
