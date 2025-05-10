#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { z } from 'zod';

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

// Schemas for NPM quality, maintenance and popularity metrics
export const NpmQualitySchema = z.object({
	score: z.number(),
	tests: z.number(),
	coverage: z.number(),
	linting: z.number(),
	types: z.number(),
});

export const NpmMaintenanceSchema = z.object({
	score: z.number(),
	issuesResolutionTime: z.number(),
	commitsFrequency: z.number(),
	releaseFrequency: z.number(),
	lastUpdate: z.string(),
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
						})
						.optional(),
					links: z
						.object({
							npm: z.string().optional(),
							homepage: z.string().optional(),
							repository: z.string().optional(),
						})
						.optional(),
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
		total: z.number(),
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

// Define tools
const TOOLS: Tool[] = [
	// NPM Package Analysis Tools
	{
		name: 'npmVersions',
		description: 'Get all available versions of an NPM package',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z.array(z.string()).describe('List of package names to get versions for'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmLatest',
		description: 'Get the latest version and changelog of an NPM package',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z.array(z.string()).describe('List of package names to get latest versions for'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmDeps',
		description: 'Analyze dependencies and devDependencies of an NPM package',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z.array(z.string()).describe('List of package names to analyze dependencies for'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmTypes',
		description: 'Check TypeScript types availability and version for a package',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z.array(z.string()).describe('List of package names to check types for'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmSize',
		description: 'Get package size information including dependencies and bundle size',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z.array(z.string()).describe('List of package names to get size information for'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmVulnerabilities',
		description: 'Check for known vulnerabilities in packages',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z
					.array(z.string())
					.describe('List of package names to check for vulnerabilities'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmTrends',
		description:
			'Get download trends and popularity metrics for packages. Available periods: "last-week" (7 days), "last-month" (30 days), or "last-year" (365 days)',
		parameters: z.object({
			packages: z.array(z.string()).describe('List of package names to get trends for'),
			period: z
				.enum(['last-week', 'last-month', 'last-year'])
				.describe('Time period for trends. Options: "last-week", "last-month", "last-year"')
				.optional()
				.default('last-month'),
		}),
		inputSchema: {
			type: 'object',
			properties: {
				packages: {
					type: 'array',
					items: { type: 'string' },
					description: 'List of package names to get trends for',
				},
				period: {
					type: 'string',
					enum: ['last-week', 'last-month', 'last-year'],
					description:
						'Time period for trends. Options: "last-week" (7 days), "last-month" (30 days), or "last-year" (365 days)',
					default: 'last-month',
				},
			},
			required: ['packages'],
		},
	},
	{
		name: 'npmCompare',
		description: 'Compare multiple NPM packages based on various metrics',
		parameters: z.object({
			packages: z.array(z.string()).describe('List of package names to compare'),
		}),
		inputSchema: {
			type: 'object',
			properties: {
				packages: {
					type: 'array',
					items: { type: 'string' },
				},
			},
			required: ['packages'],
		},
	},
	{
		name: 'npmMaintainers',
		description: 'Get maintainers for an NPM package',
		parameters: z.object({
			packageName: z.string().describe('The name of the package'),
		}),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
			},
			required: ['packageName'],
		},
	},
	{
		name: 'npmScore',
		description:
			'Get consolidated package score based on quality, maintenance, and popularity metrics',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z.array(z.string()).describe('List of package names to get scores for'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmPackageReadme',
		description: 'Get the README for an NPM package',
		parameters: z.union([
			z.object({
				packageName: z.string().describe('The name of the package'),
			}),
			z.object({
				packages: z.array(z.string()).describe('List of package names to get READMEs for'),
			}),
		]),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				packages: { type: 'array', items: { type: 'string' } },
			},
			oneOf: [{ required: ['packageName'] }, { required: ['packages'] }],
		},
	},
	{
		name: 'npmSearch',
		description: 'Search for NPM packages',
		parameters: z.object({
			query: z.string().describe('Search query for packages'),
			limit: z
				.number()
				.min(1)
				.max(50)
				.optional()
				.describe('Maximum number of results to return (default: 10)'),
		}),
		inputSchema: {
			type: 'object',
			properties: {
				query: { type: 'string' },
				limit: { type: 'number', minimum: 1, maximum: 50 },
			},
			required: ['query'],
		},
	},
];

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
				// Version from input is not directly used to filter, but can be reported
				// let version: string | undefined = undefined;

				if (typeof pkgInput === 'string') {
					const atIdx = pkgInput.lastIndexOf('@');
					if (atIdx > 0) {
						name = pkgInput.slice(0, atIdx);
						// version = pkgInput.slice(atIdx + 1); // We don't need to store version for this tool's core logic
					} else {
						name = pkgInput;
					}
				} else {
					return {
						packageInput: JSON.stringify(pkgInput), // Handle non-string input gracefully
						packageName: 'unknown_package_input',
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				if (!name) {
					// Should not happen if pkgInput is a non-empty string
					return {
						packageInput: pkgInput,
						packageName: 'empty_package_name',
						status: 'error',
						error: 'Empty package name derived from input',
						data: null,
						message: 'Package name could not be determined from input.',
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

					return {
						packageInput: pkgInput,
						packageName: name,
						status: 'success',
						error: null,
						data: {
							allVersions,
							tags,
							latestVersionTag,
						},
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
					// Should not happen with current schema, but good for robustness
					return {
						package: 'unknown_package_input',
						status: 'error',
						error: 'Invalid package input type',
						data: null,
						message: 'Package input was not a string.',
					};
				}

				const packageNameForOutput = version === 'latest' ? name : `${name}@${version}`;

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

					return {
						package: `${name}@${actualVersion}`,
						status: 'success',
						error: null,
						data: depData,
						message: `Dependencies for ${name}@${actualVersion}`,
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
						// Error fetching @types package, isAvailable remains false
						console.debug(`Could not fetch @types package ${typesPackageName}: ${typesError}`);
					}

					return {
						package: finalPackageName,
						status: 'success',
						error: null,
						data: {
							mainPackage: {
								name: name,
								version: actualVersion,
								hasBuiltInTypes: hasBuiltInTypes,
								typesPath: typesPath,
							},
							typesPackage: typesPackageInfo,
						},
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

				// Use name@version for bundlephobia if version is specified, otherwise just name (it defaults to latest)
				const bundlephobiaQuery = version === 'latest' ? name : `${name}@${version}`;
				const packageNameForOutput = bundlephobiaQuery;

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

					const rawData: any = await response.json(); // Cast to any for initial error check

					// Bundlephobia might return an error object in the JSON body for invalid package versions
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

					// Bundlephobia provides the resolved version in its response if 'latest' was queried
					// However, its response structure for `name` and `version` is not always consistent with NpmPackageDataSchema
					// We will stick to `packageNameForOutput` for the package name in the result.
					// If Bundlephobia returns a specific version (e.g. for `pkg@latest`), `rawData.version` might have it.

					const typedRawData = rawData as BundlephobiaData; // Explicit cast after type guard

					const sizeData = {
						name: (typedRawData as any).name || name,
						version:
							(typedRawData as any).version || (version === 'latest' ? 'latest_resolved' : version),
						sizeInKb: Number((typedRawData.size / 1024).toFixed(2)),
						gzipInKb: Number((typedRawData.gzip / 1024).toFixed(2)),
						dependencyCount: typedRawData.dependencyCount,
					};

					return {
						package: packageNameForOutput, // Or construct as `${sizeData.name}@${sizeData.version}` if preferred
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
				const packageNameForOutput = version ? `${name}@${version}` : name;

				if (!response.ok) {
					return {
						package: packageNameForOutput,
						versionQueried: version || null,
						status: 'error',
						error: `OSV API Error: ${response.statusText}`,
						vulnerabilities: [],
					};
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
				if (vulns.length === 0) {
					return {
						package: packageNameForOutput,
						versionQueried: version || null,
						status: 'success',
						vulnerabilities: [],
						message: `No known vulnerabilities found${queryVersionSpecified ? ' for the specified version' : ''}.`,
					};
				}

				return {
					package: packageNameForOutput,
					versionQueried: version || null,
					status: 'success',
					vulnerabilities: vulns.map((vuln) => {
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
								// Check if the vulnerability is fixed in the queried version
								if (queryVersionSpecified && version && lifecycle.fixed) {
									// Basic semver comparison: assumes simple x.y.z versions
									const queriedParts = version.split('.').map(Number);
									const fixedParts = lifecycle.fixed.split('.').map(Number);
									let isFixedDecision = false; // Default to not fixed if loop completes without decision
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
										// If parts are equal, continue to the next part
										// If loop finishes and all parts were equal or fixed was shorter, it means fixed <= queried
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
					}),
					message: `${vulns.length} vulnerability(ies) found${queryVersionSpecified ? ' for the specified version' : ''}.`,
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
		// If period is undefined, empty or invalid, use default value
		const period =
			args.period && ['last-week', 'last-month', 'last-year'].includes(args.period)
				? args.period
				: 'last-month';

		const periodDays = {
			'last-week': 7,
			'last-month': 30,
			'last-year': 365,
		};

		type SuccessResult = {
			name: string;
			downloads: number;
			success: true;
		};

		type ErrorResult = {
			name: string;
			error: string;
			success: false;
		};

		type FetchResult = SuccessResult | ErrorResult;

		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://api.npmjs.org/downloads/point/${period}/${pkg}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
				});
				if (!response.ok) {
					return {
						name: pkg,
						error: `Failed to fetch download trends: ${response.statusText}`,
						success: false as const,
					};
				}
				const data = await response.json();
				if (!isNpmDownloadsData(data)) {
					return {
						name: pkg,
						error: 'Invalid response format from npm downloads API',
						success: false as const,
					};
				}
				return {
					name: pkg,
					downloads: data.downloads,
					success: true as const,
				};
			}),
		);

		let text = '📈 Download Trends\n\n';
		text += `Period: ${period} (${periodDays[period]} days)\n\n`;

		// Individual package stats
		for (const result of results) {
			if (!result.success) {
				text += `❌ ${result.name}: ${result.error}\n`;
				continue;
			}
			text += `📦 ${result.name}\n`;
			text += `Total downloads: ${result.downloads.toLocaleString()}\n`;
			text += `Average daily downloads: ${Math.round(result.downloads / periodDays[period]).toLocaleString()}\n\n`;
		}

		// Total stats
		const totalDownloads = results.reduce((total, result) => {
			if (result.success) {
				return total + result.downloads;
			}
			return total;
		}, 0);

		text += `Total downloads across all packages: ${totalDownloads.toLocaleString()}\n`;
		text += `Average daily downloads across all packages: ${Math.round(totalDownloads / periodDays[period]).toLocaleString()}\n`;

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{ type: 'text', text: `Error fetching download trends: ${(error as Error).message}` },
			],
			isError: true,
		};
	}
}

export async function handleNpmCompare(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const [infoRes, downloadsRes] = await Promise.all([
					fetch(`https://registry.npmjs.org/${pkg}/latest`),
					fetch(`https://api.npmjs.org/downloads/point/last-month/${pkg}`),
				]);

				if (!infoRes.ok || !downloadsRes.ok) {
					throw new Error(`Failed to fetch data for ${pkg}`);
				}

				const info = await infoRes.json();
				const downloads = await downloadsRes.json();

				if (!isNpmPackageData(info) || !isNpmDownloadsData(downloads)) {
					throw new Error(`Invalid response format for ${pkg}`);
				}

				return {
					name: pkg,
					version: info.version,
					description: info.description,
					downloads: downloads.downloads,
					license: info.license,
					dependencies: Object.keys(info.dependencies || {}).length,
				};
			}),
		);

		let text = '📊 Package Comparison\n\n';

		// Table header
		text += 'Package | Version | Monthly Downloads | Dependencies | License\n';
		text += '--------|---------|------------------|--------------|--------\n';

		// Table rows
		for (const pkg of results) {
			text += `${pkg.name} | ${pkg.version} | ${pkg.downloads.toLocaleString()} | ${pkg.dependencies} | ${pkg.license || 'N/A'}\n`;
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [{ type: 'text', text: `Error comparing packages: ${(error as Error).message}` }],
			isError: true,
		};
	}
}

// Function to get package quality metrics
export async function handleNpmQuality(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://api.npms.io/v2/package/${encodeURIComponent(pkg)}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
				});
				if (!response.ok) {
					return { name: pkg, error: `Failed to fetch quality data: ${response.statusText}` };
				}
				const rawData = await response.json();

				if (!isValidNpmsResponse(rawData)) {
					return { name: pkg, error: 'Invalid response format from npms.io API' };
				}

				const quality = rawData.score.detail.quality;

				return {
					name: pkg,
					...NpmQualitySchema.parse({
						score: Math.round(quality * 100) / 100,
						tests: 0, // These values are no longer available in the API
						coverage: 0,
						linting: 0,
						types: 0,
					}),
				};
			}),
		);

		let text = '📊 Quality Metrics\n\n';
		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
				continue;
			}

			text += `📦 ${result.name}\n`;
			text += `- Overall Score: ${result.score}\n`;
			text +=
				'- Note: Detailed metrics (tests, coverage, linting, types) are no longer provided by the API\n\n';
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

export async function handleNpmMaintenance(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://api.npms.io/v2/package/${encodeURIComponent(pkg)}`, {
					headers: {
						Accept: 'application/json',
						'User-Agent': 'NPM-Sentinel-MCP',
					},
				});
				if (!response.ok) {
					return { name: pkg, error: `Failed to fetch maintenance data: ${response.statusText}` };
				}
				const rawData = await response.json();

				if (!isValidNpmsResponse(rawData)) {
					return { name: pkg, error: 'Invalid response format from npms.io API' };
				}

				const maintenance = rawData.score.detail.maintenance;

				return {
					name: pkg,
					score: Math.round(maintenance * 100) / 100,
				};
			}),
		);

		let text = '🛠️ Maintenance Metrics\n\n';
		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
				continue;
			}

			text += `📦 ${result.name}\n`;
			text += `- Maintenance Score: ${result.score}\n\n`;
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching maintenance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

export async function handleNpmMaintainers(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`);

				if (response.status === 404) {
					return {
						name: pkg,
						error: 'Package not found in the npm registry',
					};
				}

				if (!response.ok) {
					throw new Error(
						`API request failed with status ${response.status} (${response.statusText})`,
					);
				}

				const data = await response.json();
				if (!isNpmPackageInfo(data)) {
					throw new Error('Invalid package info data received');
				}

				return {
					name: pkg,
					maintainers: data.maintainers || [],
				};
			}),
		);

		let text = '👥 Package Maintainers\n\n';

		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
				continue;
			}

			text += `📦 ${result.name}\n`;
			text += `${'-'.repeat(40)}\n`;

			const maintainers = result.maintainers || [];
			if (maintainers.length === 0) {
				text += '⚠️ No maintainers found.\n';
			} else {
				text += `👥 Maintainers (${maintainers.length}):\n\n`;
				for (const maintainer of maintainers) {
					text += `• ${maintainer.name}\n`;
					text += `  📧 ${maintainer.email}\n\n`;
				}
			}

			if (results.indexOf(result) < results.length - 1) {
				text += '\n';
			}
		}

		return {
			content: [
				{
					type: 'text',
					text,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching package maintainers: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

export async function handleNpmScore(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://api.npms.io/v2/package/${encodeURIComponent(pkg)}`);

				if (response.status === 404) {
					return {
						name: pkg,
						error: 'Package not found in the npm registry',
					};
				}

				if (!response.ok) {
					throw new Error(
						`API request failed with status ${response.status} (${response.statusText})`,
					);
				}

				const rawData = await response.json();

				if (!isValidNpmsResponse(rawData)) {
					return {
						name: pkg,
						error: 'Invalid or incomplete response from npms.io API',
					};
				}

				const { score, collected } = rawData;
				const { detail } = score;

				return {
					name: pkg,
					score,
					detail,
					collected,
				};
			}),
		);

		let text = '📊 Package Scores\n\n';

		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
				continue;
			}

			text += `📦 ${result.name}\n`;
			text += `${'-'.repeat(40)}\n`;
			text += `Overall Score: ${(result.score.final * 100).toFixed(1)}%\n\n`;
			text += '🎯 Quality Breakdown:\n';
			text += `• Quality: ${(result.detail.quality * 100).toFixed(1)}%\n`;
			text += `• Maintenance: ${(result.detail.maintenance * 100).toFixed(1)}%\n`;
			text += `• Popularity: ${(result.detail.popularity * 100).toFixed(1)}%\n\n`;

			if (result.collected.github) {
				text += '📈 GitHub Stats:\n';
				text += `• Stars: ${result.collected.github.starsCount.toLocaleString()}\n`;
				text += `• Forks: ${result.collected.github.forksCount.toLocaleString()}\n`;
				text += `• Watchers: ${result.collected.github.subscribersCount.toLocaleString()}\n`;
				text += `• Total Issues: ${result.collected.github.issues.count.toLocaleString()}\n`;
				text += `• Open Issues: ${result.collected.github.issues.openCount.toLocaleString()}\n\n`;
			}

			if (result.collected.npm?.downloads?.length > 0) {
				const lastDownloads = result.collected.npm.downloads[0];
				text += '📥 NPM Downloads:\n';
				text += `• Last day: ${lastDownloads.count.toLocaleString()} (${new Date(lastDownloads.from).toLocaleDateString()} - ${new Date(lastDownloads.to).toLocaleDateString()})\n\n`;
			}

			if (results.indexOf(result) < results.length - 1) {
				text += '\n';
			}
		}

		// Return in standard MCP format
		return {
			content: [
				{
					type: 'text',
					text,
				},
			],
			isError: false,
		};
	} catch (error) {
		// Error handling in standard MCP format
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching package scores: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

export async function handleNpmPackageReadme(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://registry.npmjs.org/${pkg}`);
				if (!response.ok) {
					throw new Error(`Failed to fetch package info: ${response.statusText}`);
				}

				const rawData = await response.json();
				if (!isNpmPackageInfo(rawData)) {
					throw new Error('Invalid package info data received');
				}

				const latestVersion = rawData['dist-tags']?.latest;
				if (!latestVersion || !rawData.versions?.[latestVersion]) {
					throw new Error('No latest version found');
				}

				const readme = rawData.versions[latestVersion].readme || rawData.readme;

				if (!readme) {
					return { name: pkg, version: latestVersion, text: 'No README found' };
				}

				return { name: pkg, version: latestVersion, text: readme };
			}),
		);

		let text = '';
		for (const result of results) {
			text += `${'='.repeat(80)}\n`;
			text += `📖 ${result.name}@${result.version}\n`;
			text += `${'='.repeat(80)}\n\n`;
			text += result.text;

			if (results.indexOf(result) < results.length - 1) {
				text += '\n\n';
				text += `${'='.repeat(80)}\n\n`;
			}
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching READMEs: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

export async function handleNpmSearch(args: {
	query: string;
	limit?: number;
}): Promise<CallToolResult> {
	try {
		const limit = args.limit || 10;
		const response = await fetch(
			`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(args.query)}&size=${limit}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to search packages: ${response.statusText}`);
		}

		const rawData = await response.json();
		const parseResult = NpmSearchResultSchema.safeParse(rawData);
		if (!parseResult.success) {
			throw new Error('Invalid search results data received');
		}

		const { objects, total } = parseResult.data;
		let text = `🔍 Search results for "${args.query}"\n`;
		text += `Found ${total.toLocaleString()} packages (showing top ${limit})\n\n`;

		for (const result of objects) {
			const pkg = result.package;
			const score = result.score;

			text += `📦 ${pkg.name}@${pkg.version}\n`;
			if (pkg.description) text += `${pkg.description}\n`;

			// Normalize and format score to ensure it's between 0 and 1
			const normalizedScore = Math.min(1, score.final / 100);
			const finalScore = normalizedScore.toFixed(2);
			text += `Score: ${finalScore} (${(normalizedScore * 100).toFixed(0)}%)\n`;

			if (pkg.keywords && pkg.keywords.length > 0) {
				text += `Keywords: ${pkg.keywords.join(', ')}\n`;
			}

			if (pkg.links) {
				text += 'Links:\n';
				if (pkg.links.npm) text += `• NPM: ${pkg.links.npm}\n`;
				if (pkg.links.homepage) text += `• Homepage: ${pkg.links.homepage}\n`;
				if (pkg.links.repository) text += `• Repository: ${pkg.links.repository}\n`;
			}

			text += '\n';
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error searching packages: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

// License compatibility checker
export async function handleNpmLicenseCompatibility(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const licenses = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
				if (!response.ok) {
					throw new Error(`Failed to fetch license info for ${pkg}: ${response.statusText}`);
				}
				const data = (await response.json()) as { license?: string };
				return {
					package: pkg,
					license: data.license || 'UNKNOWN',
				};
			}),
		);

		let text = '📜 License Compatibility Analysis\n\n';
		text += 'Packages analyzed:\n';
		for (const { package: pkg, license } of licenses) {
			text += `• ${pkg}: ${license}\n`;
		}
		text += '\n';

		// Basic license compatibility check
		const hasGPL = licenses.some(({ license }) => license?.includes('GPL'));
		const hasMIT = licenses.some(({ license }) => license === 'MIT');
		const hasApache = licenses.some(({ license }) => license?.includes('Apache'));
		const hasUnknown = licenses.some(({ license }) => license === 'UNKNOWN');

		text += 'Compatibility Analysis:\n';
		if (hasUnknown) {
			text += '⚠️ Warning: Some packages have unknown licenses. Manual review recommended.\n';
		}
		if (hasGPL) {
			text += '⚠️ Contains GPL licensed code. Resulting work may need to be GPL licensed.\n';
			if (hasMIT || hasApache) {
				text += '⚠️ Mixed GPL with MIT/Apache licenses. Review carefully for compliance.\n';
			}
		} else if (hasMIT && hasApache) {
			text += '✅ MIT and Apache 2.0 licenses are compatible.\n';
		} else if (hasMIT) {
			text += '✅ All MIT licensed. Generally safe to use.\n';
		} else if (hasApache) {
			text += '✅ All Apache licensed. Generally safe to use.\n';
		}

		text +=
			'\nNote: This is a basic analysis. For legal compliance, please consult with a legal expert.\n';

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error analyzing license compatibility: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
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
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				// First get the package info from npm to find the repository URL
				const npmResponse = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
				if (!npmResponse.ok) {
					throw new Error(`Failed to fetch npm info for ${pkg}: ${npmResponse.statusText}`);
				}
				const npmData = (await npmResponse.json()) as {
					repository?: { url?: string; type?: string };
				};

				if (!npmData.repository?.url) {
					return { name: pkg, text: `No repository URL found for package ${pkg}` };
				}

				// Extract GitHub repo info from URL
				const repoUrl = npmData.repository.url;
				const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
				if (!match) {
					return { name: pkg, text: `Could not parse GitHub repository URL: ${repoUrl}` };
				}

				const [, owner, repo] = match;

				// Fetch repository stats from GitHub API
				const githubResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
					headers: {
						Accept: 'application/vnd.github.v3+json',
						'User-Agent': 'MCP-Server',
					},
				});

				if (!githubResponse.ok) {
					throw new Error(`Failed to fetch GitHub stats: ${githubResponse.statusText}`);
				}

				const data = (await githubResponse.json()) as GitHubRepoStats;

				const text = [
					`${'='.repeat(80)}`,
					`📊 Repository Statistics for ${pkg}`,
					`${'='.repeat(80)}\n`,
					'🌟 Engagement Metrics',
					`${'─'.repeat(40)}`,
					`• Stars:       ${data.stargazers_count.toLocaleString().padEnd(10)} ⭐`,
					`• Forks:       ${data.forks_count.toLocaleString().padEnd(10)} 🔄`,
					`• Watchers:    ${data.watchers_count.toLocaleString().padEnd(10)} 👀`,
					`• Open Issues: ${data.open_issues_count.toLocaleString().padEnd(10)} 🔍\n`,
					'📅 Timeline',
					`${'─'.repeat(40)}`,
					`• Created:      ${new Date(data.created_at).toLocaleDateString()}`,
					`• Last Updated: ${new Date(data.updated_at).toLocaleDateString()}\n`,
					'🔧 Repository Details',
					`${'─'.repeat(40)}`,
					`• Default Branch: ${data.default_branch}`,
					`• Wiki Enabled:   ${data.has_wiki ? 'Yes' : 'No'}\n`,
					'🏷️ Topics',
					`${'─'.repeat(40)}`,
					data.topics.length
						? data.topics.map((topic) => `• ${topic}`).join('\n')
						: '• No topics found',
					'',
				].join('\n');

				return { name: pkg, text };
			}),
		);

		let text = '';
		for (const result of results) {
			text += result.text;
			if (results.indexOf(result) < results.length - 1) {
				text += '\n\n';
			}
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error analyzing repository stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
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
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				// First get the package info from npm to find the repository URL
				const npmResponse = await fetch(`https://registry.npmjs.org/${pkg}`);
				if (!npmResponse.ok) {
					throw new Error(`Failed to fetch npm info for ${pkg}: ${npmResponse.statusText}`);
				}
				const npmData = await npmResponse.json();
				if (!isNpmPackageInfo(npmData)) {
					throw new Error('Invalid package info data received');
				}

				const repository = npmData.repository?.url;
				if (!repository) {
					return { name: pkg, text: `No repository found for package ${pkg}` };
				}

				// Extract GitHub repo info from URL
				const match = repository.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
				if (!match) {
					return { name: pkg, text: `Could not parse GitHub repository URL: ${repository}` };
				}

				const [, owner, repo] = match;

				// Check common changelog file names
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

				let changelog = null;
				for (const file of changelogFiles) {
					try {
						const response = await fetch(
							`https://raw.githubusercontent.com/${owner}/${repo}/master/${file}`,
						);
						if (response.ok) {
							changelog = await response.text();
							break;
						}
					} catch (error) {
						console.error(`Error fetching ${file}:`, error);
					}
				}

				// Get release information from GitHub API
				const githubResponse = await fetch(
					`https://api.github.com/repos/${owner}/${repo}/releases`,
					{
						headers: {
							Accept: 'application/vnd.github.v3+json',
							'User-Agent': 'MCP-Server',
						},
					},
				);

				const releases = (githubResponse.ok ? await githubResponse.json() : []) as GithubRelease[];

				let text = `📋 Changelog Analysis for ${pkg}\n\n`;

				// Analyze version history from npm
				const versions = Object.keys(npmData.versions || {}).sort((a, b) => {
					const [aMajor = 0, aMinor = 0] = a.split('.').map(Number);
					const [bMajor = 0, bMinor = 0] = b.split('.').map(Number);
					return bMajor - aMajor || bMinor - aMinor;
				});

				text += '📦 Version History:\n';
				text += `• Total versions: ${versions.length}\n`;
				text += `• Latest version: ${versions[0]}\n`;
				text += `• First version: ${versions[versions.length - 1]}\n\n`;

				if (changelog) {
					text += '📝 Changelog found!\n\n';
					// Extract and analyze the last few versions from changelog
					const recentChanges = changelog.split('\n').slice(0, 20).join('\n');
					text += `Recent changes:\n${recentChanges}\n...\n\n`;
				} else {
					text += '⚠️ No changelog file found in repository root\n\n';
				}

				if (releases.length > 0) {
					text += '🚀 Recent GitHub Releases:\n\n';
					for (const release of releases.slice(0, 5)) {
						text += `${release.tag_name || 'No tag'}\n`;
						if (release.name) text += `Title: ${release.name}\n`;
						if (release.published_at)
							text += `Published: ${new Date(release.published_at).toLocaleDateString()}\n`;
						text += '\n';
					}
				} else {
					text += 'ℹ️ No GitHub releases found\n';
				}

				return { name: pkg, text };
			}),
		);

		let text = '';
		for (const result of results) {
			text += result.text;
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error analyzing changelog: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

export async function handleNpmAlternatives(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(
					`https://registry.npmjs.org/-/v1/search?text=keywords:${pkg}&size=10`,
				);
				if (!response.ok) {
					throw new Error(`Failed to search for alternatives: ${response.statusText}`);
				}

				const data = (await response.json()) as NpmSearchResponse;
				const alternatives = data.objects;

				const downloadCounts = await Promise.all(
					alternatives.map(async (alt) => {
						try {
							const response = await fetch(
								`https://api.npmjs.org/downloads/point/last-month/${alt.package.name}`,
							);
							if (!response.ok) return 0;

							const downloadData = (await response.json()) as DownloadCount;
							return downloadData.downloads;
						} catch (error) {
							console.error(`Error fetching download count for ${alt.package.name}:`, error);
							return 0;
						}
					}),
				);

				// Get original package downloads for comparison
				const originalDownloads = await fetch(
					`https://api.npmjs.org/downloads/point/last-month/${pkg}`,
				)
					.then((res) => res.json() as Promise<DownloadCount>)
					.then((data) => data.downloads)
					.catch(() => 0);

				let text = `🔄 Alternative Packages to ${pkg}\n\n`;
				text += 'Original package:\n';
				text += `📦 ${pkg}\n`;
				text += `Downloads: ${originalDownloads.toLocaleString()}/month\n`;
				text += `Keywords: ${alternatives[0].package.keywords?.join(', ')}\n\n`;
				text += 'Alternative packages found:\n\n';

				alternatives.forEach((alt, index) => {
					const downloads = downloadCounts[index];
					const score = alt.score.final;

					text += `${index + 1}. 📦 ${alt.package.name}\n`;
					if (alt.package.description) text += `   ${alt.package.description}\n`;
					text += `   Downloads: ${downloads.toLocaleString()}/month\n`;
					text += `   Score: ${(score * 100).toFixed(0)}%\n`;
					if (alt.package.links?.repository) text += `   Repo: ${alt.package.links.repository}\n`;
					if (alt.package.keywords?.length)
						text += `   Keywords: ${alt.package.keywords.join(', ')}\n`;
					text += '\n';
				});

				return { name: pkg, text };
			}),
		);

		let text = '';
		for (const result of results) {
			text += result.text;
		}

		return { content: [{ type: 'text', text }], isError: false };
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error finding alternatives: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

// Create server instance
const server = new McpServer({
	name: 'mcp-npm-tools',
	version: '1.0.0',
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
