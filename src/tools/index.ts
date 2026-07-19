import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import {
	handleNpmAlternatives,
	handleNpmChangelogAnalysis,
	handleNpmCompare,
	handleNpmDeprecated,
	handleNpmDeps,
	handleNpmLatest,
	handleNpmLicenseCompatibility,
	handleNpmMaintainers,
	handleNpmMaintenance,
	handleNpmQuality,
	handleNpmPackageReadme,
	handleNpmRepoStats,
	handleNpmScore,
	handleNpmSearch,
	handleNpmSize,
	handleNpmTrends,
	handleNpmTypes,
	handleNpmVersions,
	handleNpmVulnerabilities,
} from '../handlers/index.js';
import { NPM_METRICS_ICON, NPM_REGISTRY_ICON, NPM_SECURITY_ICON } from '../icons.js';

// Helper schemas for structured outputs (MCP v2)
const BatchResultOutputSchema = z
	.object({
		results: z.array(z.record(z.string(), z.unknown())).optional(),
		summary: z.record(z.string(), z.unknown()).optional(),
		message: z.string().optional(),
	})
	.passthrough();

const SearchResultOutputSchema = z
	.object({
		query: z.string().optional(),
		limitUsed: z.number().optional(),
		totalResults: z.number().optional(),
		resultsCount: z.number().optional(),
		results: z.array(z.record(z.string(), z.unknown())).optional(),
		message: z.string().optional(),
	})
	.passthrough();

const CompareResultOutputSchema = z
	.object({
		queryPackages: z.array(z.string()).optional(),
		results: z.array(z.record(z.string(), z.unknown())).optional(),
		message: z.string().optional(),
	})
	.passthrough();

const LicenseCompatibilityResultOutputSchema = z
	.object({
		packagesAnalyzed: z.array(z.string()).optional(),
		compatibility: z.record(z.string(), z.unknown()).optional(),
		licenseDetails: z.array(z.record(z.string(), z.unknown())).optional(),
	})
	.passthrough();

async function withStructuredOutput(
	handlerPromise: Promise<CallToolResult>,
): Promise<CallToolResult> {
	const res = await handlerPromise;
	try {
		const text = (res.content[0] as { type: string; text?: string })?.text;
		if (text && (text.startsWith('{') || text.startsWith('['))) {
			const parsed = JSON.parse(text);
			return {
				...res,
				structuredContent: parsed,
			};
		}
	} catch {}
	return res;
}

export function registerAllTools(server: McpServer): void {
	server.registerTool(
		'npmVersions',
		{
			description: 'Get all available versions of an NPM package',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get versions for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_REGISTRY_ICON,
			annotations: {
				title: 'Get All Package Versions',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmVersions for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmVersions(args));
		},
	);

	server.registerTool(
		'npmLatest',
		{
			description: 'Get the latest version and changelog of an NPM package',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get latest versions for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_REGISTRY_ICON,
			annotations: {
				title: 'Get Latest Package Information',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmLatest for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmLatest(args));
		},
	);

	server.registerTool(
		'npmDeps',
		{
			description: 'Analyze dependencies and devDependencies of an NPM package',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to analyze dependencies for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_REGISTRY_ICON,
			annotations: {
				title: 'Get Package Dependencies',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmDeps for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmDeps(args));
		},
	);

	server.registerTool(
		'npmTypes',
		{
			description: 'Check TypeScript types availability and version for a package',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to check types for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_REGISTRY_ICON,
			annotations: {
				title: 'Check TypeScript Type Availability',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmTypes for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmTypes(args));
		},
	);

	server.registerTool(
		'npmSize',
		{
			description: 'Get package size information including dependencies and bundle size',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get size information for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_METRICS_ICON,
			annotations: {
				title: 'Get Package Size (Bundlephobia)',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmSize for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmSize(args));
		},
	);

	server.registerTool(
		'npmVulnerabilities',
		{
			description: 'Check for known vulnerabilities in packages',
			inputSchema: z.object({
				packages: z
					.array(z.string())
					.describe('List of package names to check for vulnerabilities'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_SECURITY_ICON,
			annotations: {
				title: 'Check Package Vulnerabilities (OSV.dev)',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: false,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.(
				'info',
				`Executing npmVulnerabilities for ${args.packages.join(', ')}`,
			);
			return await withStructuredOutput(handleNpmVulnerabilities(args));
		},
	);

	server.registerTool(
		'npmTrends',
		{
			description: 'Get download trends and popularity metrics for packages',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get trends for'),
				period: z
					.enum(['last-week', 'last-month', 'last-year'])
					.describe('Time period for trends. Options: "last-week", "last-month", "last-year"')
					.optional()
					.default('last-month'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_METRICS_ICON,
			annotations: {
				title: 'Get NPM Package Download Trends',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (
			args: { packages: string[]; period?: 'last-week' | 'last-month' | 'last-year' },
			ctx: any,
		) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmTrends for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmTrends(args));
		},
	);

	server.registerTool(
		'npmCompare',
		{
			description: 'Compare multiple NPM packages based on various metrics',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to compare'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: CompareResultOutputSchema,
			icons: NPM_METRICS_ICON,
			annotations: {
				title: 'Compare NPM Packages',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmCompare for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmCompare(args));
		},
	);

	server.registerTool(
		'npmMaintainers',
		{
			description: 'Get maintainers information for NPM packages',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get maintainers for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_METRICS_ICON,
			annotations: {
				title: 'Get NPM Package Maintainers',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmMaintainers for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmMaintainers(args));
		},
	);

	server.registerTool(
		'npmScore',
		{
			description:
				'Get consolidated package score based on quality, maintenance, and popularity metrics',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get scores for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_METRICS_ICON,
			annotations: {
				title: 'Get NPM Package Score (NPMS.io)',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmScore for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmScore(args));
		},
	);

	server.registerTool(
		'npmPackageReadme',
		{
			description: 'Get the README content for NPM packages',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get READMEs for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_REGISTRY_ICON,
			annotations: {
				title: 'Get NPM Package README',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.(
				'info',
				`Executing npmPackageReadme for ${args.packages.join(', ')}`,
			);
			return await withStructuredOutput(handleNpmPackageReadme(args));
		},
	);

	server.registerTool(
		'npmSearch',
		{
			description: 'Search for NPM packages with optional limit',
			inputSchema: z.object({
				query: z.string().describe('Search query for packages'),
				limit: z
					.number()
					.min(1)
					.max(50)
					.optional()
					.describe('Maximum number of results to return (default: 10)'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: SearchResultOutputSchema,
			icons: NPM_REGISTRY_ICON,
			annotations: {
				title: 'Search NPM Packages',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: false,
			},
		},
		async (args: { query: string; limit?: number }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmSearch for query: "${args.query}"`);
			return await withStructuredOutput(handleNpmSearch(args));
		},
	);

	server.registerTool(
		'npmLicenseCompatibility',
		{
			description: 'Check license compatibility between multiple packages',
			inputSchema: z.object({
				packages: z
					.array(z.string())
					.min(1)
					.describe('List of package names to check for license compatibility'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: LicenseCompatibilityResultOutputSchema,
			icons: NPM_REGISTRY_ICON,
			annotations: {
				title: 'Check NPM License Compatibility',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.(
				'info',
				`Executing npmLicenseCompatibility for ${args.packages.join(', ')}`,
			);
			return await withStructuredOutput(handleNpmLicenseCompatibility(args));
		},
	);

	server.registerTool(
		'npmRepoStats',
		{
			description: 'Get repository statistics for NPM packages',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to get repository stats for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_SECURITY_ICON,
			annotations: {
				title: 'Get NPM Package Repository Stats (GitHub)',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmRepoStats for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmRepoStats(args));
		},
	);

	server.registerTool(
		'npmDeprecated',
		{
			description: 'Check if packages are deprecated',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to check for deprecation'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_SECURITY_ICON,
			annotations: {
				title: 'Check NPM Package Deprecation Status',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmDeprecated for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmDeprecated(args));
		},
	);

	server.registerTool(
		'npmChangelogAnalysis',
		{
			description: 'Analyze changelog and release history of packages',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to analyze changelogs for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_SECURITY_ICON,
			annotations: {
				title: 'Analyze NPM Package Changelog (GitHub)',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.(
				'info',
				`Executing npmChangelogAnalysis for ${args.packages.join(', ')}`,
			);
			return await withStructuredOutput(handleNpmChangelogAnalysis(args));
		},
	);

	server.registerTool(
		'npmAlternatives',
		{
			description: 'Find alternative packages with similar functionality',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to find alternatives for'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_SECURITY_ICON,
			annotations: {
				title: 'Find NPM Package Alternatives',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: false,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmAlternatives for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmAlternatives(args));
		},
	);

	server.registerTool(
		'npmQuality',
		{
			description: 'Analyze package quality metrics',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to analyze'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_METRICS_ICON,
			annotations: {
				title: 'Analyze NPM Package Quality (NPMS.io)',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmQuality for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmQuality(args));
		},
	);

	server.registerTool(
		'npmMaintenance',
		{
			description: 'Analyze package maintenance metrics',
			inputSchema: z.object({
				packages: z.array(z.string()).describe('List of package names to analyze'),
				ignoreCache: z.boolean().optional().describe('Force a fresh lookup, ignoring the cache'),
			}),
			outputSchema: BatchResultOutputSchema,
			icons: NPM_METRICS_ICON,
			annotations: {
				title: 'Analyze NPM Package Maintenance (NPMS.io)',
				readOnlyHint: true,
				openWorldHint: true,
				idempotentHint: true,
			},
		},
		async (args: { packages: string[] }, ctx: any) => {
			await ctx?.mcpReq?.log?.('info', `Executing npmMaintenance for ${args.packages.join(', ')}`);
			return await withStructuredOutput(handleNpmMaintenance(args));
		},
	);
}
