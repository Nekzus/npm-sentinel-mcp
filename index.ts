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
		author: z.union([z.string(), z.object({}).passthrough()]).optional(),
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

export const NpmPopularitySchema = z.object({
	score: z.number(),
	stars: z.number(),
	downloads: z.number(),
	dependents: z.number(),
	communityInterest: z.number(),
});

// Interfaz actualizada para la respuesta de npms.io
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

async function handleNpmVersions(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const results = await Promise.all(
			packagesToProcess.map(async (pkg) => {
				const response = await fetch(`https://registry.npmjs.org/${pkg}`);
				if (!response.ok) {
					return { name: pkg, error: `Failed to fetch package info: ${response.statusText}` };
				}

				const rawData = await response.json();
				if (!isNpmPackageInfo(rawData)) {
					return { name: pkg, error: 'Invalid package info data received' };
				}

				const versions = Object.keys(rawData.versions ?? {}).sort((a, b) => {
					const [aMajor = 0, aMinor = 0, aPatch = 0] = a.split('.').map(Number);
					const [bMajor = 0, bMinor = 0, bPatch = 0] = b.split('.').map(Number);
					if (aMajor !== bMajor) return aMajor - bMajor;
					if (aMinor !== bMinor) return aMinor - bMinor;
					return aPatch - bPatch;
				});

				return { name: pkg, versions };
			}),
		);

		let text = '';
		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
			} else {
				text += `📦 Available versions for ${result.name}:\n${result.versions.join('\n')}\n\n`;
			}
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching package versions: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
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

async function handleNpmLatest(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packages = args.packages || [];
		let text = '';

		for (const pkg of packages) {
			const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`);

			if (!response.ok) {
				throw new Error(`Failed to fetch latest version for ${pkg}: ${response.statusText}`);
			}

			const data = (await response.json()) as NpmLatestVersionResponse;
			text += `📦 Latest version of ${pkg}\n`;
			text += `Version: ${data.version}\n`;
			text += `Description: ${data.description || 'No description available'}\n`;
			text += `Author: ${data.author?.name || 'Unknown'}\n`;
			text += `License: ${data.license || 'Unknown'}\n`;
			text += `Homepage: ${data.homepage || 'Not specified'}\n\n`;
			text += '---\n\n';
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
					text: `Error fetching latest version: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmDeps(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const results = await Promise.all(
			packagesToProcess.map(async (pkg) => {
				try {
					const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
					if (!response.ok) {
						return { name: pkg, error: `Failed to fetch package info: ${response.statusText}` };
					}

					const rawData = await response.json();
					if (!isNpmPackageData(rawData)) {
						return { name: pkg, error: 'Invalid package data received' };
					}

					return {
						name: pkg,
						version: rawData.version,
						dependencies: rawData.dependencies ?? {},
						devDependencies: rawData.devDependencies ?? {},
						peerDependencies: rawData.peerDependencies ?? {},
					};
				} catch (error) {
					return { name: pkg, error: error instanceof Error ? error.message : 'Unknown error' };
				}
			}),
		);

		let text = '';
		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
				continue;
			}

			text += `📦 Dependencies for ${result.name}@${result.version}\n\n`;

			if (Object.keys(result.dependencies).length > 0) {
				text += 'Dependencies:\n';
				for (const [dep, version] of Object.entries(result.dependencies)) {
					text += `• ${dep}: ${version}\n`;
				}
				text += '\n';
			}

			if (Object.keys(result.devDependencies).length > 0) {
				text += 'Dev Dependencies:\n';
				for (const [dep, version] of Object.entries(result.devDependencies)) {
					text += `• ${dep}: ${version}\n`;
				}
				text += '\n';
			}

			if (Object.keys(result.peerDependencies).length > 0) {
				text += 'Peer Dependencies:\n';
				for (const [dep, version] of Object.entries(result.peerDependencies)) {
					text += `• ${dep}: ${version}\n`;
				}
				text += '\n';
			}

			text += '---\n\n';
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmTypes(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
				if (!response.ok) {
					throw new Error(`Failed to fetch package info: ${response.statusText}`);
				}
				const data = (await response.json()) as NpmPackageData;

				let text = `📦 TypeScript support for ${pkg}@${data.version}\n`;

				const hasTypes: boolean = Boolean(data.types || data.typings);
				if (hasTypes) {
					text += '✅ Package includes built-in TypeScript types\n';
					text += `Types path: ${data.types || data.typings}\n`;
				}

				const typesPackage = `@types/${pkg.replace('@', '').replace('/', '__')}`;
				const typesResponse = await fetch(
					`https://registry.npmjs.org/${typesPackage}/latest`,
				).catch(() => null);

				if (typesResponse?.ok) {
					const typesData = (await typesResponse.json()) as NpmPackageData;
					text += `📦 DefinitelyTyped package available: ${typesPackage}@${typesData.version}\n`;
					text += `Install with: npm install -D ${typesPackage}`;
				} else if (!hasTypes) {
					text += '❌ No TypeScript type definitions found';
				}

				return { name: pkg, text };
			}),
		);

		let text = '';
		for (const result of results) {
			text += `${result.text}\n\n`;
			if (results.indexOf(result) < results.length - 1) {
				text += '---\n\n';
			}
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{ type: 'text', text: `Error checking TypeScript types: ${(error as Error).message}` },
			],
			isError: true,
		};
	}
}

async function handleNpmSize(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const results = await Promise.all(
			packagesToProcess.map(async (pkg) => {
				const response = await fetch(`https://bundlephobia.com/api/size?package=${pkg}`);
				if (!response.ok) {
					return { name: pkg, error: `Failed to fetch package size: ${response.statusText}` };
				}

				const rawData = await response.json();
				if (!isBundlephobiaData(rawData)) {
					return { name: pkg, error: 'Invalid response from bundlephobia' };
				}

				return {
					name: pkg,
					sizeInKb: Number((rawData.size / 1024).toFixed(2)),
					gzipInKb: Number((rawData.gzip / 1024).toFixed(2)),
					dependencyCount: rawData.dependencyCount,
				};
			}),
		);

		let text = '';
		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
			} else {
				text += `📦 ${result.name}\n`;
				text += `Size: ${result.sizeInKb}KB (gzipped: ${result.gzipInKb}KB)\n`;
				text += `Dependencies: ${result.dependencyCount}\n\n`;
			}
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching package sizes: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmVulnerabilities(args: {
	packages: string[];
}): Promise<CallToolResult> {
	try {
		const packagesToProcess = args.packages || [];
		if (packagesToProcess.length === 0) {
			throw new Error('No package names provided');
		}

		const results = await Promise.all(
			packagesToProcess.map(async (pkg) => {
				const response = await fetch('https://api.osv.dev/v1/query', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						package: {
							name: pkg,
							ecosystem: 'npm',
						},
					}),
				});

				if (!response.ok) {
					return { name: pkg, error: `Failed to fetch vulnerability info: ${response.statusText}` };
				}

				const data = (await response.json()) as {
					vulns?: Array<{
						summary: string;
						severity?: string | { type?: string; score?: number };
						references?: Array<{ url: string }>;
					}>;
				};

				return { name: pkg, vulns: data.vulns || [] };
			}),
		);

		let text = '🔒 Security Analysis\n\n';
		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
				continue;
			}

			text += `📦 ${result.name}\n`;
			if (result.vulns.length === 0) {
				text += '✅ No known vulnerabilities\n\n';
			} else {
				text += `⚠️ Found ${result.vulns.length} vulnerabilities:\n\n`;
				for (const vuln of result.vulns) {
					text += `- ${vuln.summary}\n`;
					const severity =
						typeof vuln.severity === 'object'
							? vuln.severity.type || 'Unknown'
							: vuln.severity || 'Unknown';
					text += `  Severity: ${severity}\n`;
					if (vuln.references && vuln.references.length > 0) {
						text += `  More info: ${vuln.references[0].url}\n`;
					}
					text += '\n';
				}
			}
			text += '---\n\n';
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error checking vulnerabilities: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmTrends(args: {
	packages: string[];
	period?: 'last-week' | 'last-month' | 'last-year';
}): Promise<CallToolResult> {
	try {
		const period = args.period || 'last-month';
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
				const response = await fetch(`https://api.npmjs.org/downloads/point/${period}/${pkg}`);
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{ type: 'text', text: `Error fetching download trends: ${(error as Error).message}` },
			],
			isError: true,
		};
	}
}

async function handleNpmCompare(args: { packages: string[] }): Promise<CallToolResult> {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [{ type: 'text', text: `Error comparing packages: ${(error as Error).message}` }],
			isError: true,
		};
	}
}

// Function to get package quality metrics
async function handleNpmQuality(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://api.npms.io/v2/package/${encodeURIComponent(pkg)}`);
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		} as CallToolResult;
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		} as CallToolResult;
	}
}

async function handleNpmMaintenance(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://api.npms.io/v2/package/${encodeURIComponent(pkg)}`);
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		} as CallToolResult;
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching maintenance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		} as CallToolResult;
	}
}

async function handleNpmPopularity(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://api.npms.io/v2/package/${encodeURIComponent(pkg)}`);
				if (!response.ok) {
					return { name: pkg, error: `Failed to fetch popularity data: ${response.statusText}` };
				}
				const data = await response.json();

				if (!isValidNpmsResponse(data)) {
					return { name: pkg, error: 'Invalid API response format' };
				}

				const popularityScore = data.score.detail.popularity;

				return {
					name: pkg,
					...NpmPopularitySchema.parse({
						score: Math.round(popularityScore * 100) / 100,
						stars: 0,
						downloads: 0,
						dependents: 0,
						communityInterest: 0,
					}),
				};
			}),
		);

		let text = '📈 Popularity Metrics\n\n';
		for (const result of results) {
			if ('error' in result) {
				text += `❌ ${result.name}: ${result.error}\n\n`;
				continue;
			}

			text += `📦 ${result.name}\n`;
			text += `- Overall Score: ${result.score}\n`;
			text += '- Note: Detailed metrics are no longer provided by the API\n\n';
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		} as CallToolResult;
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching popularity metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		} as CallToolResult;
	}
}

async function handleNpmMaintainers(args: { packages: string[] }): Promise<CallToolResult> {
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

async function handleNpmScore(args: { packages: string[] }): Promise<CallToolResult> {
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

		// Retornar en el formato MCP estándar
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
		// Manejo de errores en formato MCP estándar
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

async function handleNpmPackageReadme(args: { packages: string[] }): Promise<CallToolResult> {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
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

async function handleNpmSearch(args: { query: string; limit?: number }): Promise<CallToolResult> {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
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
async function handleNpmLicenseCompatibility(args: {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
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
async function handleNpmRepoStats(args: { packages: string[] }): Promise<CallToolResult> {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
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
}

interface DownloadCount {
	downloads: number;
}

async function handleNpmDeprecated(args: { packages: string[] }): Promise<CallToolResult> {
	try {
		const results = await Promise.all(
			args.packages.map(async (pkg) => {
				const response = await fetch(`https://registry.npmjs.org/${pkg}`);
				if (!response.ok) {
					throw new Error(`Failed to fetch package info: ${response.statusText}`);
				}

				const rawData = (await response.json()) as NpmRegistryResponse;
				if (!isNpmPackageInfo(rawData)) {
					throw new Error('Invalid package info data received');
				}

				// Get latest version info
				const latestVersion = rawData['dist-tags']?.latest;
				if (!latestVersion || !rawData.versions?.[latestVersion]) {
					throw new Error('No latest version found');
				}

				const latestVersionInfo = rawData.versions[latestVersion];
				const dependencies = {
					...(latestVersionInfo.dependencies || {}),
					...(latestVersionInfo.devDependencies || {}),
					...(latestVersionInfo.peerDependencies || {}),
				};

				// Check each dependency
				const deprecatedDeps: DeprecatedDependency[] = [];
				await Promise.all(
					Object.entries(dependencies).map(async ([dep, version]) => {
						try {
							const depResponse = await fetch(`https://registry.npmjs.org/${dep}`);
							if (!depResponse.ok) return;

							const depData = (await depResponse.json()) as NpmRegistryResponse;
							const depVersion = version.replace(/[^0-9.]/g, '');
							if (depData.versions?.[depVersion]?.deprecated) {
								deprecatedDeps.push({
									name: dep,
									version: depVersion,
									message: depData.versions[depVersion].deprecated || 'No message provided',
								});
							}
						} catch (error) {
							console.error(`Error checking ${dep}:`, error);
						}
					}),
				);

				// Check if the package itself is deprecated
				const isDeprecated = latestVersionInfo.deprecated;
				let text = `📦 Deprecation Check for ${pkg}@${latestVersion}\n\n`;

				if (isDeprecated) {
					text += '⚠️ WARNING: This package is deprecated!\n';
					text += `Deprecation message: ${latestVersionInfo.deprecated}\n\n`;
				} else {
					text += '✅ This package is not deprecated\n\n';
				}

				if (deprecatedDeps.length > 0) {
					text += `Found ${deprecatedDeps.length} deprecated dependencies:\n\n`;
					for (const dep of deprecatedDeps) {
						text += `⚠️ ${dep.name}@${dep.version}\n`;
						text += `   Message: ${dep.message}\n\n`;
					}
				} else {
					text += '✅ No deprecated dependencies found\n';
				}

				return { name: pkg, text };
			}),
		);

		let text = '';
		for (const result of results) {
			text += result.text;
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error checking deprecated packages: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmChangelogAnalysis(args: { packages: string[] }): Promise<CallToolResult> {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
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

async function handleNpmAlternatives(args: { packages: string[] }): Promise<CallToolResult> {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
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
	{
		packages: z.array(z.string()).describe('List of package names to get versions for'),
	},
	async (args) => {
		return await handleNpmVersions(args);
	},
);

server.tool(
	'npmLatest',
	{
		packages: z.array(z.string()).describe('List of package names to get latest versions for'),
	},
	async (args) => {
		return await handleNpmLatest(args);
	},
);

server.tool(
	'npmDeps',
	{
		packages: z.array(z.string()).describe('List of package names to analyze dependencies for'),
	},
	async (args) => {
		return await handleNpmDeps(args);
	},
);

server.tool(
	'npmTypes',
	{
		packages: z.array(z.string()).describe('List of package names to check types for'),
	},
	async (args) => {
		return await handleNpmTypes(args);
	},
);

server.tool(
	'npmSize',
	{
		packages: z.array(z.string()).describe('List of package names to get size information for'),
	},
	async (args) => {
		return await handleNpmSize(args);
	},
);

server.tool(
	'npmVulnerabilities',
	{
		packages: z.array(z.string()).describe('List of package names to check for vulnerabilities'),
	},
	async (args) => {
		return await handleNpmVulnerabilities(args);
	},
);

server.tool(
	'npmTrends',
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
	{
		packages: z.array(z.string()).describe('List of package names to compare'),
	},
	async (args) => {
		return await handleNpmCompare(args);
	},
);

server.tool(
	'npmMaintainers',
	{
		packages: z.array(z.string()).describe('List of package names to get maintainers for'),
	},
	async (args) => {
		return await handleNpmMaintainers(args);
	},
);

server.tool(
	'npmScore',
	{
		packages: z.array(z.string()).describe('List of package names to get scores for'),
	},
	async (args) => {
		return await handleNpmScore(args);
	},
);

server.tool(
	'npmPackageReadme',
	{
		packages: z.array(z.string()).describe('List of package names to get READMEs for'),
	},
	async (args) => {
		return await handleNpmPackageReadme(args);
	},
);

server.tool(
	'npmSearch',
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
	{
		packages: z.array(z.string()).describe('List of package names to get repository stats for'),
	},
	async (args) => {
		return await handleNpmRepoStats(args);
	},
);

server.tool(
	'npmDeprecated',
	{
		packages: z.array(z.string()).describe('List of package names to check for deprecation'),
	},
	async (args) => {
		return await handleNpmDeprecated(args);
	},
);

server.tool(
	'npmChangelogAnalysis',
	{
		packages: z.array(z.string()).describe('List of package names to analyze changelogs for'),
	},
	async (args) => {
		return await handleNpmChangelogAnalysis(args);
	},
);

server.tool(
	'npmAlternatives',
	{
		packages: z.array(z.string()).describe('List of package names to find alternatives for'),
	},
	async (args) => {
		return await handleNpmAlternatives(args);
	},
);

server.tool(
	'npmQuality',
	{
		packages: z.array(z.string()).describe('List of package names to analyze'),
	},
	async (args) => {
		return await handleNpmQuality(args);
	},
);

server.tool(
	'npmMaintenance',
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
