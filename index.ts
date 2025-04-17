#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import { z } from 'zod';

// Zod schemas for npm package data
const NpmPackageVersionSchema = z
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

const NpmPackageInfoSchema = z
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

const NpmPackageDataSchema = z.object({
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

const BundlephobiaDataSchema = z.object({
	size: z.number(),
	gzip: z.number(),
	dependencyCount: z.number(),
});

const NpmDownloadsDataSchema = z.object({
	downloads: z.number(),
	start: z.string(),
	end: z.string(),
	package: z.string(),
});

// Schemas for NPM quality, maintenance and popularity metrics
const NpmQualitySchema = z.object({
	score: z.number(),
	tests: z.number(),
	coverage: z.number(),
	linting: z.number(),
	types: z.number(),
});

const NpmMaintenanceSchema = z.object({
	score: z.number(),
	issuesResolutionTime: z.number(),
	commitsFrequency: z.number(),
	releaseFrequency: z.number(),
	lastUpdate: z.string(),
});

const NpmPopularitySchema = z.object({
	score: z.number(),
	stars: z.number(),
	downloads: z.number(),
	dependents: z.number(),
	communityInterest: z.number(),
});

interface NpmsApiResponse {
	score: {
		quality: {
			score: number;
			tests: number;
			coverage: number;
			linting: number;
			types: number;
		};
		maintenance: {
			score: number;
			issuesResolutionTime: number;
			commitsFrequency: number;
			releaseFrequency: number;
			lastUpdate: string;
		};
		popularity: {
			score: number;
			stars: number;
			downloads: number;
			dependents: number;
			communityInterest: number;
		};
	};
}

// Type inference
type NpmPackageInfo = z.infer<typeof NpmPackageInfoSchema>;
type NpmPackageData = z.infer<typeof NpmPackageDataSchema>;
type BundlephobiaData = z.infer<typeof BundlephobiaDataSchema>;
type NpmDownloadsData = z.infer<typeof NpmDownloadsDataSchema>;

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
		const response = await fetch(`https://registry.npmjs.org/${args.packageName}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch package info: ${response.statusText}`);
		}

		const rawData = await response.json();
		if (!isNpmPackageInfo(rawData)) {
			throw new Error('Invalid package info data received');
		}

		const latestVersion = rawData['dist-tags']?.latest;
		if (!latestVersion || !rawData.versions) {
			throw new Error('No latest version or versions data found');
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
		const data = (await response.json()) as NpmsApiResponse;
		const quality = data.score.quality;

		const result = NpmQualitySchema.parse({
			score: Math.round(quality.score * 100) / 100,
			tests: Math.round(quality.tests * 100) / 100,
			coverage: Math.round(quality.coverage * 100) / 100,
			linting: Math.round(quality.linting * 100) / 100,
			types: Math.round(quality.types * 100) / 100,
		});

		return {
			content: [
				{
					type: 'text',
					text: `Quality metrics for ${args.packageName}:
- Overall Score: ${result.score}
- Tests: ${result.tests}
- Coverage: ${result.coverage}
- Linting: ${result.linting}
- Types: ${result.types}`,
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

// Function to get package maintenance metrics
async function handleNpmMaintenance(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(
			`https://api.npms.io/v2/package/${encodeURIComponent(args.packageName)}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch maintenance data: ${response.statusText}`);
		}
		const data = (await response.json()) as NpmsApiResponse;
		const maintenance = data.score.maintenance;

		const result = NpmMaintenanceSchema.parse({
			score: Math.round(maintenance.score * 100) / 100,
			issuesResolutionTime: Math.round(maintenance.issuesResolutionTime * 100) / 100,
			commitsFrequency: Math.round(maintenance.commitsFrequency * 100) / 100,
			releaseFrequency: Math.round(maintenance.releaseFrequency * 100) / 100,
			lastUpdate: new Date(maintenance.lastUpdate).toISOString(),
		});

		return {
			content: [
				{
					type: 'text',
					text: `Maintenance metrics for ${args.packageName}:
- Overall Score: ${result.score}
- Issues Resolution Time: ${result.issuesResolutionTime}
- Commits Frequency: ${result.commitsFrequency}
- Release Frequency: ${result.releaseFrequency}
- Last Update: ${new Date(result.lastUpdate).toLocaleDateString()}`,
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

// Function to get package popularity metrics
async function handleNpmPopularity(args: { packageName: string }): Promise<CallToolResult> {
	try {
		const response = await fetch(
			`https://api.npms.io/v2/package/${encodeURIComponent(args.packageName)}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch popularity data: ${response.statusText}`);
		}
		const data = (await response.json()) as NpmsApiResponse;
		const popularity = data.score.popularity;

		const result = NpmPopularitySchema.parse({
			score: Math.round(popularity.score * 100) / 100,
			stars: Math.round(popularity.stars),
			downloads: Math.round(popularity.downloads),
			dependents: Math.round(popularity.dependents),
			communityInterest: Math.round(popularity.communityInterest * 100) / 100,
		});

		return {
			content: [
				{
					type: 'text',
					text: `Popularity metrics for ${args.packageName}:
- Overall Score: ${result.score}
- GitHub Stars: ${result.stars}
- Downloads: ${result.downloads}
- Dependent Packages: ${result.dependents}
- Community Interest: ${result.communityInterest}`,
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

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

process.stdin.on('close', () => {
	server.close();
});
