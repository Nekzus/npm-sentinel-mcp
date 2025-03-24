#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	type CallToolResult,
	ListResourcesRequestSchema,
	ListToolsRequestSchema,
	ReadResourceRequestSchema,
	type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import QRCode from 'qrcode';

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
			properties: {},
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
	{
		name: 'calculator',
		description: 'Perform mathematical calculations with support for basic and advanced operations',
		inputSchema: {
			type: 'object',
			properties: {
				expression: {
					type: 'string',
					description: 'Mathematical expression to evaluate (e.g., "2 + 2 * 3")',
				},
				precision: {
					type: 'number',
					description: 'Number of decimal places for the result (default: 2)',
				},
			},
			required: ['expression'],
		},
	},
	{
		name: 'passwordGen',
		description: 'Generate a secure password with customizable options',
		inputSchema: {
			type: 'object',
			properties: {
				length: {
					type: 'number',
					description: 'Length of the password (default: 16)',
				},
				includeNumbers: {
					type: 'boolean',
					description: 'Include numbers in the password (default: true)',
				},
				includeSymbols: {
					type: 'boolean',
					description: 'Include special symbols in the password (default: true)',
				},
				includeUppercase: {
					type: 'boolean',
					description: 'Include uppercase letters in the password (default: true)',
				},
			},
		},
	},
	{
		name: 'qrGen',
		description: 'Generate a QR code for the given text or URL',
		inputSchema: {
			type: 'object',
			properties: {
				text: {
					type: 'string',
					description: 'Text or URL to encode in the QR code',
				},
				size: {
					type: 'number',
					description: 'Size of the QR code in pixels (default: 200)',
				},
				dark: {
					type: 'string',
					description: 'Color for dark modules (default: "#000000")',
				},
				light: {
					type: 'string',
					description: 'Color for light modules (default: "#ffffff")',
				},
			},
			required: ['text'],
		},
	},
	{
		name: 'kitchenConvert',
		description: 'Convert between common kitchen measurements and weights',
		inputSchema: {
			type: 'object',
			properties: {
				value: {
					type: 'number',
					description: 'Value to convert',
				},
				from: {
					type: 'string',
					description: 'Source unit (e.g., "cup", "tbsp", "g", "oz", "ml")',
				},
				to: {
					type: 'string',
					description: 'Target unit (e.g., "cup", "tbsp", "g", "oz", "ml")',
				},
				ingredient: {
					type: 'string',
					description: 'Optional ingredient for accurate volume-to-weight conversions',
				},
			},
			required: ['value', 'from', 'to'],
		},
	},
];

// Tool handlers
async function handleGreeting(args: { name: string }): Promise<CallToolResult> {
	return {
		content: [
			{
				type: 'text',
				text: `👋 Hello ${args.name}! Welcome to the MCP server!`,
			},
		],
		isError: false,
	};
}

async function handleCard(): Promise<CallToolResult> {
	const suits = ['♠️', '♥️', '♣️', '♦️'];
	const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
	const suit = suits[Math.floor(Math.random() * suits.length)];
	const value = values[Math.floor(Math.random() * values.length)];

	return {
		content: [
			{
				type: 'text',
				text: `🎴 Drew card: ${value}${suit}`,
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
				text: `🕒 Current date and time in ${timeZone}: ${formattedDate}`,
			},
		],
		isError: false,
	};
}

async function handleCalculator(args: {
	expression: string;
	precision?: number;
}): Promise<CallToolResult> {
	try {
		const sanitizedExpression = args.expression.replace(/[^0-9+\-*/().%\s]/g, '');
		const calculate = new Function(`return ${sanitizedExpression}`);
		const result = calculate();
		const precision = args.precision ?? 2;
		const formattedResult = Number.isInteger(result) ? result : Number(result.toFixed(precision));

		return {
			content: [
				{
					type: 'text',
					text: `🔢 Result: ${formattedResult}`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error calculating result: ${(error as Error).message}`,
				},
			],
			isError: true,
		};
	}
}

async function handlePasswordGen(args: {
	length?: number;
	includeNumbers?: boolean;
	includeSymbols?: boolean;
	includeUppercase?: boolean;
}): Promise<CallToolResult> {
	const length = args.length ?? 16;
	const includeNumbers = args.includeNumbers ?? true;
	const includeSymbols = args.includeSymbols ?? true;
	const includeUppercase = args.includeUppercase ?? true;

	let chars = 'abcdefghijklmnopqrstuvwxyz';
	if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	if (includeNumbers) chars += '0123456789';
	if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

	let password = '';
	for (let i = 0; i < length; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return {
		content: [
			{
				type: 'text',
				text: `🔐 Generated password: ${password}`,
			},
		],
		isError: false,
	};
}

async function handleQRGen(args: {
	text: string;
	size?: number;
	dark?: string;
	light?: string;
}): Promise<CallToolResult> {
	try {
		const { text, size = 200, dark = '#000000', light = '#ffffff' } = args;

		// Generate QR code as Data URL
		const qrDataUrl = await QRCode.toDataURL(text, {
			width: size,
			margin: 1,
			color: {
				dark,
				light,
			},
		});

		return {
			content: [
				{
					type: 'text',
					text: `📱 QR Code generated successfully!\n\nProperties:\n• Content: ${text}\n• Size: ${size}px\n• Dark Color: ${dark}\n• Light Color: ${light}\n\nQR Code (Data URL):\n${qrDataUrl}`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `Error generating QR code: ${(error as Error).message}`,
				},
			],
			isError: true,
		};
	}
}

async function handleKitchenConvert(args: {
	value: number;
	from: string;
	to: string;
	ingredient?: string;
}): Promise<CallToolResult> {
	// Simplified conversion logic
	const result = args.value; // Add proper conversion logic here

	return {
		content: [
			{
				type: 'text',
				text: `⚖️ Converted ${args.value} ${args.from} to ${result} ${args.to}${args.ingredient ? ` of ${args.ingredient}` : ''}`,
			},
		],
		isError: false,
	};
}

async function handleToolCall(name: string, args: any): Promise<CallToolResult> {
	switch (name) {
		case 'greeting':
			return handleGreeting(args);
		case 'card':
			return handleCard();
		case 'datetime':
			return handleDateTime(args);
		case 'calculator':
			return handleCalculator(args);
		case 'passwordGen':
			return handlePasswordGen(args);
		case 'qrGen':
			return handleQRGen(args);
		case 'kitchenConvert':
			return handleKitchenConvert(args);
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

const server = new Server(
	{
		name: 'nekzus/mcp-server',
		version: '0.1.0',
	},
	{
		capabilities: {
			resources: {},
			tools: {},
		},
	},
);

// Setup request handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
	resources: [],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
	throw new Error(`Resource not found: ${request.params.uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
	handleToolCall(request.params.name, request.params.arguments ?? {}),
);

async function runServer() {
	const transport = new StdioServerTransport();

	// Handle direct messages
	process.stdin.on('data', async (data) => {
		try {
			const message = JSON.parse(data.toString());
			if (message.method === 'tools/call') {
				const result = await handleToolCall(message.params.name, message.params.arguments ?? {});
				process.stdout.write(
					`${JSON.stringify({
						jsonrpc: '2.0',
						result,
						id: message.id,
					})}\n`,
				);
			}
		} catch (error) {
			if (error instanceof Error) {
				process.stdout.write(
					`${JSON.stringify({
						jsonrpc: '2.0',
						error: {
							code: -32000,
							message: error.message,
						},
					})}\n`,
				);
			}
		}
	});

	await server.connect(transport);
}

runServer().catch(log);

process.stdin.on('close', () => {
	server.close();
});
