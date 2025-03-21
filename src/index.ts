#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import 'dotenv/config';
import availableTools from './tools/index.js';

// Definición de tipos
interface ToolResponse {
	content: Array<{
		type: string;
		text: string;
		data?: unknown;
	}>;
	isError?: boolean;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResponse>;

export class McpUtilityServer {
	private readonly server: Server;
	private readonly transport: StdioServerTransport;
	private readonly tools: readonly Tool[];

	constructor() {
		this.server = new Server(
			{
				name: '@nekzus/mcp-server',
				version: '1.0.0',
				description:
					'MCP Server implementation providing utility functions and tools for development and testing',
			},
			{
				capabilities: {
					resources: {},
					tools: {},
				},
			},
		);

		this.transport = new StdioServerTransport();
		this.tools = availableTools;

		// Configurar los manejadores de solicitudes
		this.setupRequestHandlers();
	}

	private setupRequestHandlers(): void {
		// Listar herramientas disponibles
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: this.tools,
		}));

		// Manejar llamadas a herramientas
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args = {} } = request.params;

			try {
				const tool = this.tools.find((t) => t.name === name);
				if (!tool) {
					throw new Error(`Tool not found: ${name}`);
				}

				const handler = tool.handler as ToolHandler;
				const result = await handler(args);

				return {
					content: result.content.map((content) => {
						const mappedContent = {
							type: content.type,
							text:
								typeof content.text === 'string'
									? content.text
									: JSON.stringify(content.text, null, 2),
						};

						if (content.data !== undefined) {
							return { ...mappedContent, data: content.data };
						}

						return mappedContent;
					}),
					isError: result.isError,
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: error instanceof Error ? error.message : String(error),
						},
					],
					isError: true,
				};
			}
		});
	}

	public async start(): Promise<void> {
		try {
			await this.server.connect(this.transport);
			console.log('[Server] MCP Utility Server is running');
			console.log('[Server] Available tools:', this.tools.map((t) => t.name).join(', '));

			// Handle termination signals
			process.on('SIGTERM', () => this.cleanup());
			process.on('SIGINT', () => this.cleanup());

			// Handle stdin close
			process.stdin.on('close', () => {
				console.log('[Server] Input stream closed');
				this.cleanup();
			});
		} catch (error) {
			console.error('[Server] Failed to start MCP Utility Server:', error);
			throw error;
		}
	}

	private async cleanup(): Promise<void> {
		try {
			await this.transport.close();
			console.log('[Server] MCP Utility Server stopped gracefully');
			process.exit(0);
		} catch (error) {
			console.error('[Server] Error during cleanup:', error);
			process.exit(1);
		}
	}
}

// Auto-start server if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
	const server = new McpUtilityServer();
	server.start().catch((error) => {
		console.error('[Server] Fatal error:', error);
		process.exit(1);
	});
}
