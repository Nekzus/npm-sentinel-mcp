import {
	createMcpHandler,
	WebStandardStreamableHTTPServerTransport,
	type WebStandardStreamableHTTPServerTransportOptions,
} from '@modelcontextprotocol/server';
import { setNpmRegistryUrl } from './config.js';
import { createMcpServer } from './server.js';

export {
	createMcpHandler,
	WebStandardStreamableHTTPServerTransport,
	type WebStandardStreamableHTTPServerTransportOptions,
};

export interface StreamableHttpHandlerOptions {
	npmRegistryUrl?: string;
	legacy?: 'stateless' | 'reject';
}

/**
 * Creates an HTTP request handler utilizing createMcpHandler with Dual-Era support (MCP v1 2025-11-25 + MCP v2 2026-07-28).
 *
 * Fully compliant with MCP v2 standards for all 3 primitives (Tools, Resources, Prompts).
 * Designed for serverless and web standard runtimes (Cloudflare Workers, Hono, Vercel API Routes, Express, etc.)
 */
export function createMcpHttpHandler(options: StreamableHttpHandlerOptions = {}) {
	if (options.npmRegistryUrl) {
		setNpmRegistryUrl(options.npmRegistryUrl);
	}

	const handler = createMcpHandler(
		() =>
			createMcpServer({
				config: {
					NPM_REGISTRY_URL: options.npmRegistryUrl,
				},
			}),
		{
			legacy: options.legacy ?? 'stateless',
		},
	);

	return async function handleRequest(request: Request): Promise<Response> {
		return handler.fetch(request);
	};
}
