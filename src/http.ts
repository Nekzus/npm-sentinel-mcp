import {
	WebStandardStreamableHTTPServerTransport,
	type WebStandardStreamableHTTPServerTransportOptions,
} from '@modelcontextprotocol/server';
import { setNpmRegistryUrl } from './config.js';
import createServer from './server.js';

export {
	WebStandardStreamableHTTPServerTransport,
	type WebStandardStreamableHTTPServerTransportOptions,
};

export interface StreamableHttpHandlerOptions
	extends WebStandardStreamableHTTPServerTransportOptions {
	npmRegistryUrl?: string;
}

/**
 * Creates an HTTP request handler utilizing WebStandardStreamableHTTPServerTransport
 * fully compliant with MCP v2 standards for all 3 primitives (Tools, Resources, Prompts).
 *
 * Designed for serverless and web standard runtimes (Cloudflare Workers, Hono, Vercel API Routes, Express, etc.)
 */
export function createMcpHttpHandler(options: StreamableHttpHandlerOptions = {}) {
	if (options.npmRegistryUrl) {
		setNpmRegistryUrl(options.npmRegistryUrl);
	}

	return async function handleRequest(request: Request): Promise<Response> {
		const server = createServer({
			config: {
				NPM_REGISTRY_URL: options.npmRegistryUrl,
			},
		});

		const { npmRegistryUrl, ...transportOptions } = options;

		const finalTransportOptions: WebStandardStreamableHTTPServerTransportOptions = {
			enableJsonResponse: options.enableJsonResponse ?? true,
			...transportOptions,
		};

		const transport = new WebStandardStreamableHTTPServerTransport(finalTransportOptions);
		await server.connect(transport);
		return transport.handleRequest(request);
	};
}
