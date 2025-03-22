#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Define the tools once to avoid repetition
const TOOLS = [
	{
		name: 'greeting',
		description: 'Generate a personalized greeting message for the specified person',
		inputSchema: {
			type: 'object',
			properties: {
				name: {
					type: 'string',
					description: 'Name of the recipient for the greeting',
				},
			},
			required: ['name'],
		},
	},
	{
		name: 'card',
		description: 'Draw a random card from a standard 52-card poker deck',
		inputSchema: {
			type: 'object',
			properties: {
				random_string: {
					type: 'string',
					description: 'Dummy parameter for no-parameter tools',
				},
			},
			required: ['random_string'],
		},
	},
	{
		name: 'datetime',
		description: 'Get the current date and time for a specific timezone',
		inputSchema: {
			type: 'object',
			properties: {
				timeZone: {
					type: 'string',
					description: 'Timezone identifier (e.g., "America/New_York")',
				},
				locale: {
					type: 'string',
					description: 'Locale identifier (e.g., "en-US")',
				},
			},
		},
	},
];

// Tool handlers
async function handleGreeting(args: { name: string }): Promise<CallToolResult> {
	const { name } = args;
	return {
		content: [
			{
				type: 'text',
				text: `¡Hola ${name}! ¿Cómo estás?`,
			},
		],
		isError: false,
	};
}

async function handleCard(): Promise<CallToolResult> {
	const suits = ['♠', '♥', '♦', '♣'];
	const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

	const suit = suits[Math.floor(Math.random() * suits.length)];
	const value = values[Math.floor(Math.random() * values.length)];

	return {
		content: [
			{
				type: 'text',
				text: `${value}${suit}`,
			},
		],
		isError: false,
	};
}

async function handleDateTime(args: {
	timeZone?: string;
	locale?: string;
}): Promise<CallToolResult> {
	const { timeZone = 'UTC', locale = 'en-US' } = args;

	try {
		const date = new Date();
		const formattedDate = new Intl.DateTimeFormat(locale, {
			timeZone,
			dateStyle: 'full',
			timeStyle: 'long',
		}).format(date);

		return {
			content: [
				{
					type: 'text',
					text: formattedDate,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
			],
			isError: true,
		};
	}
}

// Tool call handler
async function handleToolCall(name: string, args: any): Promise<CallToolResult> {
	switch (name) {
		case 'greeting':
			return handleGreeting(args);
		case 'card':
			return handleCard();
		case 'datetime':
			return handleDateTime(args);
		default:
			return {
				content: [
					{
						type: 'text',
						text: `Unknown tool: ${name}`,
					},
				],
				isError: true,
			};
	}
}

// Server configuration
const server = new Server(
	{
		name: '@nekzus/server-nekzus',
		version: '0.1.0',
		description: 'MCP Server implementation for development',
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Setup request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
	handleToolCall(request.params.name, request.params.arguments ?? {}),
);

// Server startup
async function runServer() {
	try {
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.log('[Server] MCP Server is running');
		console.log('[Server] Available tools:', TOOLS.map((t) => t.name).join(', '));

		// Handle stdin close
		process.stdin.on('close', () => {
			console.log('[Server] Input stream closed');
			cleanup();
		});
	} catch (error) {
		console.error('[Server] Failed to start MCP Server:', error);
		process.exit(1);
	}
}

// Cleanup function
async function cleanup() {
	try {
		await server.close();
		console.log('[Server] MCP Server stopped gracefully');
		process.exit(0);
	} catch (error) {
		console.error('[Server] Error during cleanup:', error);
		process.exit(1);
	}
}

// Start the server
runServer().catch(console.error);
