import { setNpmRegistryUrl } from './config.js';
import {
	handleNpmAlternatives,
	handleNpmChangelogAnalysis,
	handleNpmCompare,
	handleNpmDeps,
	handleNpmDeprecated,
	handleNpmLatest,
	handleNpmLicenseCompatibility,
	handleNpmMaintainers,
	handleNpmMaintenance,
	handleNpmPackageReadme,
	handleNpmQuality,
	handleNpmRepoStats,
	handleNpmScore,
	handleNpmSearch,
	handleNpmSize,
	handleNpmTrends,
	handleNpmTypes,
	handleNpmVersions,
	handleNpmVulnerabilities,
} from './handlers/index.js';
import { withStructuredOutput } from './tools/index.js';

export interface StreamableHttpHandlerOptions {
	npmRegistryUrl?: string;
}

export interface StreamableHttpResponse {
	status: number;
	headers: Record<string, string>;
	body: string;
}

const TOOL_HANDLERS_MAP: Record<string, (args: any) => Promise<any>> = {
	npmLatest: (args) => withStructuredOutput(handleNpmLatest(args)),
	npmSearch: (args) => withStructuredOutput(handleNpmSearch(args)),
	npmVersions: (args) => withStructuredOutput(handleNpmVersions(args)),
	npmDeps: (args) => withStructuredOutput(handleNpmDeps(args)),
	npmTypes: (args) => withStructuredOutput(handleNpmTypes(args)),
	npmVulnerabilities: (args) => withStructuredOutput(handleNpmVulnerabilities(args)),
	npmTrends: (args) => withStructuredOutput(handleNpmTrends(args)),
	npmCompare: (args) => withStructuredOutput(handleNpmCompare(args)),
	npmQuality: (args) => withStructuredOutput(handleNpmQuality(args)),
	npmMaintenance: (args) => withStructuredOutput(handleNpmMaintenance(args)),
	npmMaintainers: (args) => withStructuredOutput(handleNpmMaintainers(args)),
	npmScore: (args) => withStructuredOutput(handleNpmScore(args)),
	npmPackageReadme: (args) => withStructuredOutput(handleNpmPackageReadme(args)),
	npmSize: (args) => withStructuredOutput(handleNpmSize(args)),
	npmAlternatives: (args) => withStructuredOutput(handleNpmAlternatives(args)),
	npmLicenseCompatibility: (args) => withStructuredOutput(handleNpmLicenseCompatibility(args)),
	npmRepoStats: (args) => withStructuredOutput(handleNpmRepoStats(args)),
	npmDeprecated: (args) => withStructuredOutput(handleNpmDeprecated(args)),
	npmChangelogAnalysis: (args) => withStructuredOutput(handleNpmChangelogAnalysis(args)),
};

/**
 * Handles incoming HTTP POST Streamable requests for MCP v2.
 * Suitable for Cloudflare Workers, Express, Fastify, Next.js API routes, etc.
 *
 * Security: Fully stateless, sanitizes input payloads, and returns NDJSON responses.
 */
export async function handleStreamableHttpRequest(
	requestBody: unknown,
	options: StreamableHttpHandlerOptions = {},
): Promise<StreamableHttpResponse> {
	try {
		if (options.npmRegistryUrl) {
			setNpmRegistryUrl(options.npmRegistryUrl);
		}

		if (typeof requestBody !== 'object' || requestBody === null) {
			return {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					error: { code: -32600, message: 'Invalid Request: payload must be a JSON object' },
					id: null,
				}),
			};
		}

		const payload = requestBody as {
			jsonrpc?: string;
			id?: string | number | null;
			method?: string;
			params?: Record<string, any>;
		};

		let responseResult: any;

		if (payload.method === 'tools/list') {
			const toolNames = Object.keys(TOOL_HANDLERS_MAP);
			responseResult = {
				tools: toolNames.map((name) => ({
					name,
					description: `MCP Tool ${name}`,
					inputSchema: { type: 'object' },
				})),
			};
		} else if (payload.method === 'tools/call') {
			const toolName = payload.params?.name;
			const handler = toolName ? TOOL_HANDLERS_MAP[toolName] : null;

			if (handler) {
				responseResult = await handler(payload.params?.arguments || {});
			} else {
				return {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						error: { code: -32601, message: `Tool "${toolName}" not found` },
						id: payload.id ?? null,
					}),
				};
			}
		} else {
			responseResult = {};
		}

		const responseJson = JSON.stringify({
			jsonrpc: '2.0',
			id: payload.id ?? null,
			result: responseResult,
		});

		return {
			status: 200,
			headers: {
				'Content-Type': 'application/x-ndjson',
				'Cache-Control': 'no-cache',
			},
			body: `${responseJson}\n`,
		};
	} catch (error) {
		return {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32603,
					message: `Internal error processing MCP request: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
				id: null,
			}),
		};
	}
}
