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
		name: 'npmLatest',
		description: 'Get the latest version and changelog of an NPM package',
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
		name: 'npmDeps',
		description: 'Analyze dependencies and devDependencies of an NPM package',
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
		name: 'npmTypes',
		description: 'Check TypeScript types availability and version for a package',
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
		name: 'npmSize',
		description: 'Get package size information including dependencies and bundle size',
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
		name: 'npmVulnerabilities',
		description: 'Check for known vulnerabilities in a package',
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
		name: 'npmTrends',
		description: 'Get download trends and popularity metrics for a package',
		parameters: z.object({
			packageName: z.string().describe('The name of the package'),
			period: z.enum(['last-week', 'last-month', 'last-year']).describe('Time period for trends'),
		}),
		inputSchema: {
			type: 'object',
			properties: {
				packageName: { type: 'string' },
				period: {
					type: 'string',
					enum: ['last-week', 'last-month', 'last-year'],
				},
			},
			required: ['packageName', 'period'],
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
		name: 'npmPackageReadme',
		description: 'Get the README for an NPM package',
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
function isNpmPackageInfo(data: unknown): data is z.infer<typeof NpmPackageInfoSchema> {
	try {
		return NpmPackageInfoSchema.parse(data) !== null;
	} catch {
		return false;
	}
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

async function handleNpmVersions(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(`https://registry.npmjs.org/${args.packageName}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch package info: ${response.statusText}`);
		}

		const rawData = await response.json();
		if (!isNpmPackageInfo(rawData)) {
			throw new Error('Invalid package info data received');
		}

		const versions = Object.keys(rawData.versions ?? {}).sort((a, b) => {
			const [aMajor = 0, aMinor = 0, aPatch = 0] = a.split('.').map(Number);
			const [bMajor = 0, bMinor = 0, bPatch = 0] = b.split('.').map(Number);
			if (aMajor !== bMajor) return aMajor - bMajor;
			if (aMinor !== bMinor) return aMinor - bMinor;
			return aPatch - bPatch;
		});

		return {
			content: [
				{
					type: 'text',
					text: `📦 Available versions for ${args.packageName}:\n${versions.join('\n')}`,
				},
			],
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

async function handleNpmLatest(args: { packageName: string }): Promise<CallToolResult> {
	try {
		// Fetch full package info instead of just latest
		const response = await fetch(`https://registry.npmjs.org/${args.packageName}`);
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

		const latestVersionInfo = rawData.versions[latestVersion];
		const description = latestVersionInfo.description ?? '';
		const repository = latestVersionInfo.repository ?? rawData.repository;
		const homepage = latestVersionInfo.homepage ?? rawData.homepage;
		const bugs = latestVersionInfo.bugs ?? rawData.bugs;

		const text = [
			`📦 Latest version of ${args.packageName}: ${latestVersion}`,
			'',
			description && `Description:\n${description}`,
			'',
			'Links:',
			homepage && `• Homepage: ${homepage}`,
			repository?.url && `• Repository: ${repository.url.replace('git+', '').replace('.git', '')}`,
			bugs?.url && `• Issues: ${bugs.url}`,
			'',
			repository?.url?.includes('github.com') &&
				`You can check for updates at:\n${repository.url
					.replace('git+', '')
					.replace('git:', 'https:')
					.replace('.git', '')}/releases`,
		]
			.filter(Boolean)
			.join('\n');

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching package information: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmDeps(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(`https://registry.npmjs.org/${args.packageName}/latest`);
		if (!response.ok) {
			throw new Error(`Failed to fetch package info: ${response.statusText}`);
		}

		const rawData = await response.json();
		if (!isNpmPackageData(rawData)) {
			throw new Error('Invalid package data received');
		}

		const dependencies = rawData.dependencies ?? {};
		const devDependencies = rawData.devDependencies ?? {};
		const peerDependencies = rawData.peerDependencies ?? {};

		const text = [
			`📦 Dependencies for ${args.packageName}@${rawData.version}`,
			'',
			Object.keys(dependencies).length > 0 && [
				'Dependencies:',
				...Object.entries(dependencies).map(([dep, version]) => `• ${dep}: ${version}`),
				'',
			],
			Object.keys(devDependencies).length > 0 && [
				'Dev Dependencies:',
				...Object.entries(devDependencies).map(([dep, version]) => `• ${dep}: ${version}`),
				'',
			],
			Object.keys(peerDependencies).length > 0 && [
				'Peer Dependencies:',
				...Object.entries(peerDependencies).map(([dep, version]) => `• ${dep}: ${version}`),
			],
		]
			.filter(Boolean)
			.flat()
			.join('\n');

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

async function handleNpmTypes(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(`https://registry.npmjs.org/${args.packageName}/latest`);
		if (!response.ok) {
			throw new Error(`Failed to fetch package info: ${response.statusText}`);
		}
		const data = (await response.json()) as NpmPackageData;

		let text = `📦 TypeScript support for ${args.packageName}@${data.version}\n\n`;

		const hasTypes: boolean = Boolean(data.types || data.typings);
		if (hasTypes) {
			text += `✅ Package includes built-in TypeScript types\nTypes path: ${data.types || data.typings}\n\n`;
		}

		const typesPackage = `@types/${args.packageName.replace('@', '').replace('/', '__')}`;
		const typesResponse = await fetch(`https://registry.npmjs.org/${typesPackage}/latest`).catch(
			() => null,
		);

		if (typesResponse?.ok) {
			const typesData = (await typesResponse.json()) as NpmPackageData;
			text += `📦 DefinitelyTyped package available: ${typesPackage}@${typesData.version}\n`;
			text += `Install with: npm install -D ${typesPackage}\n`;
		} else if (!hasTypes) {
			text += '❌ No TypeScript type definitions found\n';
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

async function handleNpmSize(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(`https://bundlephobia.com/api/size?package=${args.packageName}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch package size: ${response.statusText}`);
		}

		const rawData = await response.json();
		if (!isBundlephobiaData(rawData)) {
			throw new Error('Invalid response from bundlephobia');
		}

		const sizeInKb = Number((rawData.size / 1024).toFixed(2));
		const gzipInKb = Number((rawData.gzip / 1024).toFixed(2));

		return {
			content: [
				{
					type: 'text',
					text: `Package size: ${sizeInKb}KB (gzipped: ${gzipInKb}KB)`,
				},
				{
					type: 'text',
					text: `Dependencies: ${rawData.dependencyCount}`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching package size: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmVulnerabilities(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch('https://api.osv.dev/v1/query', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				package: {
					name: args.packageName,
					ecosystem: 'npm',
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch vulnerability info: ${response.statusText}`);
		}

		const data = (await response.json()) as {
			vulns?: Array<{
				summary: string;
				severity?: string | { type?: string; score?: number };
				references?: Array<{ url: string }>;
			}>;
		};

		const vulns = data.vulns || [];

		let text = `🔒 Security info for ${args.packageName}\n\n`;

		if (vulns.length === 0) {
			text += '✅ No known vulnerabilities\n';
		} else {
			text += `⚠️ Found ${vulns.length} vulnerabilities:\n\n`;
			for (const vuln of vulns) {
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

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{ type: 'text', text: `Error checking vulnerabilities: ${(error as Error).message}` },
			],
			isError: true,
		};
	}
}

async function handleNpmTrends(args: {
	packageName: string;
	period?: string;
}): Promise<CallToolResult> {
	try {
		const period = args.period || 'last-month';
		const response = await fetch(
			`https://api.npmjs.org/downloads/point/${period}/${args.packageName}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch download trends: ${response.statusText}`);
		}
		const data = await response.json();
		if (!isNpmDownloadsData(data)) {
			throw new Error('Invalid response format from npm downloads API');
		}
		let text = `📈 Download trends for ${args.packageName}\n\n`;
		text += `Period: ${period}\n`;
		text += `Total downloads: ${data.downloads.toLocaleString()}\n`;
		text += `Average daily downloads: ${Math.round(data.downloads / (period === 'last-week' ? 7 : period === 'last-month' ? 30 : 365)).toLocaleString()}\n`;

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
async function handleNpmQuality(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(
			`https://api.npms.io/v2/package/${encodeURIComponent(args.packageName)}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch quality data: ${response.statusText}`);
		}
		const rawData = await response.json();

		if (!isValidNpmsResponse(rawData)) {
			throw new Error('Invalid response format from npms.io API');
		}

		const quality = rawData.score.detail.quality;

		const result = NpmQualitySchema.parse({
			score: Math.round(quality * 100) / 100,
			tests: 0, // Estos valores ya no están disponibles en la API
			coverage: 0,
			linting: 0,
			types: 0,
		});

		return {
			content: [
				{
					type: 'text',
					text: `Quality metrics for ${args.packageName}:
- Overall Score: ${result.score}
- Note: Detailed metrics (tests, coverage, linting, types) are no longer provided by the API`,
				},
			],
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

async function handleNpmMaintenance(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(
			`https://api.npms.io/v2/package/${encodeURIComponent(args.packageName)}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch maintenance data: ${response.statusText}`);
		}
		const data = await response.json();

		if (!isValidNpmsResponse(data)) {
			throw new Error('Invalid API response format');
		}

		const maintenanceScore = data.score.detail.maintenance;

		const result = NpmMaintenanceSchema.parse({
			score: Math.round(maintenanceScore * 100) / 100,
			issuesResolutionTime: 0,
			commitsFrequency: 0,
			releaseFrequency: 0,
			lastUpdate: new Date().toISOString(),
		});

		return {
			content: [
				{
					type: 'text',
					text: `Maintenance metrics for ${args.packageName}:
- Overall Score: ${result.score}
- Note: Detailed metrics are no longer provided by the API`,
				},
			],
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

async function handleNpmPopularity(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(
			`https://api.npms.io/v2/package/${encodeURIComponent(args.packageName)}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch popularity data: ${response.statusText}`);
		}
		const data = await response.json();

		if (!isValidNpmsResponse(data)) {
			throw new Error('Invalid API response format');
		}

		const popularityScore = data.score.detail.popularity;

		const result = NpmPopularitySchema.parse({
			score: Math.round(popularityScore * 100) / 100,
			stars: 0,
			downloads: 0,
			dependents: 0,
			communityInterest: 0,
		});

		return {
			content: [
				{
					type: 'text',
					text: `Popularity metrics for ${args.packageName}:
- Overall Score: ${result.score}
- Note: Detailed metrics are no longer provided by the API`,
				},
			],
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

async function handleNpmMaintainers(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(`https://registry.npmjs.org/${args.packageName}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch package info: ${response.statusText}`);
		}

		const rawData = await response.json();
		if (!isNpmPackageInfo(rawData)) {
			throw new Error('Invalid package info data received');
		}

		const maintainers = (rawData.maintainers as z.infer<typeof NpmMaintainerSchema>[]) || [];
		let text = `👥 Maintainers for ${args.packageName}:\n\n`;

		if (maintainers.length === 0) {
			text += 'No maintainers found\n';
		} else {
			for (const maintainer of maintainers) {
				text += `• ${maintainer.name}`;
				if (maintainer.email) text += ` <${maintainer.email}>`;
				if (maintainer.url) text += `\n  URL: ${maintainer.url}`;
				text += '\n';
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
					text: `Error fetching maintainers: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleNpmScore(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const encodedPackage = encodeURIComponent(args.packageName);
		const apiUrl = `https://api.npms.io/v2/package/${encodedPackage}`;

		const response = await fetch(apiUrl);

		if (response.status === 404) {
			return {
				content: [
					{
						type: 'text',
						text: `Package "${args.packageName}" not found in the npm registry. Please verify the package name and try again.`,
					},
				],
				isError: true,
			};
		}

		if (!response.ok) {
			throw new Error(`API request failed with status ${response.status} (${response.statusText})`);
		}

		const rawData = await response.json();

		if (!isValidNpmsResponse(rawData)) {
			console.debug('Response validation details:', {
				isObject: typeof rawData === 'object' && rawData !== null,
				hasScore: rawData && typeof rawData === 'object' && 'score' in rawData,
				hasCollected: rawData && typeof rawData === 'object' && 'collected' in rawData,
			});
			throw new Error('Invalid or incomplete response from npms.io API');
		}

		const { score, collected } = rawData;
		const { detail } = score;

		let text = `📊 Package Score for ${args.packageName}\n\n`;
		text += `Overall Score: ${score.final}\n\n`;

		text += `🎯 Quality: ${detail.quality}\n`;
		text += `🛠 Maintenance: ${detail.maintenance}\n`;
		text += `📈 Popularity: ${detail.popularity}\n\n`;

		if (collected.github) {
			text += '📊 GitHub Stats:\n';
			text += `• Stars: ${collected.github.starsCount.toLocaleString()}\n`;
			text += `• Forks: ${collected.github.forksCount.toLocaleString()}\n`;
			text += `• Watchers: ${collected.github.subscribersCount.toLocaleString()}\n`;
			text += `• Total Issues: ${collected.github.issues.count.toLocaleString()}\n`;
			text += `• Open Issues: ${collected.github.issues.openCount.toLocaleString()}\n\n`;
		}

		if (collected.npm?.downloads?.length > 0) {
			const lastDownloads = collected.npm.downloads[0];
			text += '📥 NPM Downloads:\n';
			text += `• Last day: ${lastDownloads.count.toLocaleString()} (${new Date(lastDownloads.from).toLocaleDateString()} - ${new Date(lastDownloads.to).toLocaleDateString()})\n`;
		}

		return {
			content: [{ type: 'text', text }],
			isError: false,
		};
	} catch (error) {
		console.error('Full error:', error);

		let errorMessage = 'An unexpected error occurred while fetching package score.';

		if (error instanceof Error) {
			if (error.message.includes('API request failed')) {
				errorMessage = `Failed to fetch package score: ${error.message}. The npms.io API might be experiencing issues.`;
			} else if (error.message.includes('Invalid or incomplete response')) {
				errorMessage = `${error.message}. The package data might be incomplete or in an unexpected format.`;
			} else {
				errorMessage = `Error fetching package score: ${error.message}`;
			}
		}

		return {
			content: [{ type: 'text', text: errorMessage }],
			isError: true,
		};
	}
}

async function handleNpmPackageReadme(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(`https://registry.npmjs.org/${args.packageName}`);
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
			return {
				content: [
					{
						type: 'text',
						text: `No README found for ${args.packageName}`,
					},
				],
				isError: false,
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: `📖 README for ${args.packageName}@${latestVersion}\n\n${readme}`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error fetching README: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
async function handleNpmRepoStats(args: { package: string }): Promise<CallToolResult> {
	try {
		// First get the package info from npm to find the repository URL
		const npmResponse = await fetch(`https://registry.npmjs.org/${args.package}/latest`);
		if (!npmResponse.ok) {
			throw new Error(`Failed to fetch npm info for ${args.package}: ${npmResponse.statusText}`);
		}
		const npmData = (await npmResponse.json()) as { repository?: { url?: string; type?: string } };

		if (!npmData.repository?.url) {
			return {
				content: [{ type: 'text', text: `No repository URL found for package ${args.package}` }],
				isError: true,
			};
		}

		// Extract GitHub repo info from URL
		const repoUrl = npmData.repository.url;
		const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
		if (!match) {
			return {
				content: [{ type: 'text', text: `Could not parse GitHub repository URL: ${repoUrl}` }],
				isError: true,
			};
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
			`📊 Repository Statistics for ${args.package}`,
			'',
			'🌟 Engagement Metrics:',
			`• Stars: ${data.stargazers_count.toLocaleString()}`,
			`• Forks: ${data.forks_count.toLocaleString()}`,
			`• Watchers: ${data.watchers_count.toLocaleString()}`,
			`• Open Issues: ${data.open_issues_count.toLocaleString()}`,
			'',
			'📅 Timeline:',
			`• Created: ${new Date(data.created_at).toLocaleDateString()}`,
			`• Last Updated: ${new Date(data.updated_at).toLocaleDateString()}`,
			'',
			'🔧 Repository Details:',
			`• Default Branch: ${data.default_branch}`,
			`• Wiki Enabled: ${data.has_wiki ? 'Yes' : 'No'}`,
			'',
			'🏷️ Topics:',
			data.topics.length
				? data.topics.map((topic) => `• ${topic}`).join('\n')
				: '• No topics found',
		].join('\n');

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

// Create server instance
const server = new McpServer({
	name: 'mcp-npm-tools',
	version: '1.0.0',
});

// Add NPM tools
server.tool(
	'npmVersions',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmVersions({ packageName });
	},
);

server.tool(
	'npmLatest',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmLatest({ packageName });
	},
);

server.tool(
	'npmDeps',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmDeps({ packageName });
	},
);

server.tool(
	'npmTypes',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmTypes({ packageName });
	},
);

server.tool(
	'npmSize',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmSize({ packageName });
	},
);

server.tool(
	'npmVulnerabilities',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmVulnerabilities({ packageName });
	},
);

server.tool(
	'npmTrends',
	{
		packageName: z.string().describe('The name of the package'),
		period: z.enum(['last-week', 'last-month', 'last-year']).describe('Time period for trends'),
	},
	async ({ packageName, period }) => {
		return await handleNpmTrends({ packageName, period });
	},
);

server.tool(
	'npmCompare',
	{ packages: z.array(z.string()).describe('List of package names to compare') },
	async ({ packages }) => {
		return await handleNpmCompare({ packages });
	},
);

server.tool(
	'npmMaintainers',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmMaintainers({ packageName });
	},
);

server.tool(
	'npmScore',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmScore({ packageName });
	},
);

server.tool(
	'npmPackageReadme',
	{ packageName: z.string().describe('The name of the package') },
	async ({ packageName }) => {
		return await handleNpmPackageReadme({ packageName });
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
	async ({ query, limit }) => {
		return await handleNpmSearch({ query, limit });
	},
);

// Add the tool to the server
server.tool(
	'npmLicenseCompatibility',
	{
		packages: z
			.array(z.string())
			.min(1)
			.describe('List of package names to check for license compatibility'),
	},
	async ({ packages }) => {
		return await handleNpmLicenseCompatibility({ packages });
	},
);

// Add the new tool to the server
server.tool(
	'npmRepoStats',
	{ package: z.string().describe('The name of the package') },
	async ({ package: packageName }) => {
		return await handleNpmRepoStats({ package: packageName });
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
