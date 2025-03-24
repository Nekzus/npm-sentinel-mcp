#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import 'dotenv/config';

// Logger function that uses stderr
const log = (...args: any[]) => console.error(...args);

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
	const { name } = args;
	return {
		content: [
			{
				type: 'text',
				text: `👋 Hello ${name}! Welcome to the MCP server!`,
			},
		],
		isError: false,
	};
}

async function handleCard(): Promise<CallToolResult> {
	const suits: Record<string, string> = {
		'♠': 'Spades',
		'♥': 'Hearts',
		'♦': 'Diamonds',
		'♣': 'Clubs',
	};
	const values: Record<string, string> = {
		A: 'Ace',
		'2': 'Two',
		'3': 'Three',
		'4': 'Four',
		'5': 'Five',
		'6': 'Six',
		'7': 'Seven',
		'8': 'Eight',
		'9': 'Nine',
		'10': 'Ten',
		J: 'Jack',
		Q: 'Queen',
		K: 'King',
	};

	const suitSymbols = Object.keys(suits);
	const valueSymbols = Object.keys(values);

	const suitSymbol = suitSymbols[Math.floor(Math.random() * suitSymbols.length)];
	const valueSymbol = valueSymbols[Math.floor(Math.random() * valueSymbols.length)];

	return {
		content: [
			{
				type: 'text',
				text: `🎴 You drew: ${values[valueSymbol]} of ${suitSymbol} ${suits[suitSymbol]}`,
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
		const dateFormatter = new Intl.DateTimeFormat(locale, {
			timeZone,
			dateStyle: 'long',
		});
		const timeFormatter = new Intl.DateTimeFormat(locale, {
			timeZone,
			timeStyle: 'medium',
		});

		const formattedDate = dateFormatter.format(date);
		const formattedTime = timeFormatter.format(date);

		return {
			content: [
				{
					type: 'text',
					text: `🗓️ Date: ${formattedDate}\n⏰ Time: ${formattedTime}\n🌍 Timezone: ${timeZone}`,
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

// New tool handlers
async function handleCalculator(args: {
	expression: string;
	precision?: number;
}): Promise<CallToolResult> {
	const { expression, precision = 2 } = args;

	try {
		// Sanitize and validate the expression
		const sanitizedExpression = expression.replace(/[^0-9+\-*/().%\s]/g, '');
		if (sanitizedExpression !== expression) {
			throw new Error('Invalid characters in expression');
		}

		// Use Function constructor instead of eval for better security
		const calculate = new Function(`return ${sanitizedExpression}`);
		const result = calculate();

		if (typeof result !== 'number' || !Number.isFinite(result)) {
			throw new Error('Invalid mathematical expression');
		}

		return {
			content: [
				{
					type: 'text',
					text: `🧮 Expression: ${expression}\n📊 Result: ${result.toFixed(precision)}`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `❌ Error: ${error instanceof Error ? error.message : 'Invalid expression'}`,
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
	const {
		length = 16,
		includeNumbers = true,
		includeSymbols = true,
		includeUppercase = true,
	} = args;

	try {
		if (length < 8 || length > 128) {
			throw new Error('Password length must be between 8 and 128 characters');
		}

		const lowercase = 'abcdefghijklmnopqrstuvwxyz';
		const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const numbers = '0123456789';
		const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

		let chars = lowercase;
		if (includeUppercase) chars += uppercase;
		if (includeNumbers) chars += numbers;
		if (includeSymbols) chars += symbols;

		let password = '';
		for (let i = 0; i < length; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		// Ensure at least one character from each selected type
		const types: { char: string; condition: boolean }[] = [
			{ char: lowercase.charAt(Math.floor(Math.random() * lowercase.length)), condition: true },
			{
				char: uppercase.charAt(Math.floor(Math.random() * uppercase.length)),
				condition: includeUppercase,
			},
			{
				char: numbers.charAt(Math.floor(Math.random() * numbers.length)),
				condition: includeNumbers,
			},
			{
				char: symbols.charAt(Math.floor(Math.random() * symbols.length)),
				condition: includeSymbols,
			},
		];

		types.forEach(({ char, condition }, index) => {
			if (condition) {
				const pos = Math.floor(Math.random() * length);
				password = password.slice(0, pos) + char + password.slice(pos + 1);
			}
		});

		return {
			content: [
				{
					type: 'text',
					text: `🔐 Generated Password:\n${password}\n\n📋 Password Properties:\n• Length: ${length}\n• Includes Numbers: ${includeNumbers ? '✅' : '❌'}\n• Includes Symbols: ${includeSymbols ? '✅' : '❌'}\n• Includes Uppercase: ${includeUppercase ? '✅' : '❌'}`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to generate password'}`,
				},
			],
			isError: true,
		};
	}
}

async function handleQRGen(args: {
	text: string;
	size?: number;
	dark?: string;
	light?: string;
}): Promise<CallToolResult> {
	const { text, size = 200, dark = '#000000', light = '#ffffff' } = args;

	try {
		if (!text) {
			throw new Error('Text is required');
		}

		if (size < 100 || size > 1000) {
			throw new Error('Size must be between 100 and 1000 pixels');
		}

		// Validate color format
		const colorRegex = /^#[0-9A-Fa-f]{6}$/;
		if (!colorRegex.test(dark) || !colorRegex.test(light)) {
			throw new Error('Invalid color format. Use hexadecimal format (e.g., #000000)');
		}

		// Here we would normally generate the QR code
		// For now, we'll return a placeholder message
		return {
			content: [
				{
					type: 'text',
					text: `📱 QR Code Properties:\n• Content: ${text}\n• Size: ${size}px\n• Dark Color: ${dark}\n• Light Color: ${light}\n\n🔄 QR Code generation successful! (Implementation pending)`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to generate QR code'}`,
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
	const { value, from, to, ingredient } = args;

	// Conversion factors (base unit: milliliters for volume, grams for weight)
	const volumeConversions: Record<string, number> = {
		ml: 1, // milliliters
		l: 1000, // liters
		cup: 236.588, // US cup
		tbsp: 14.787, // tablespoon
		tsp: 4.929, // teaspoon
		floz: 29.574, // fluid ounce
	};

	const weightConversions: Record<string, number> = {
		g: 1, // grams
		kg: 1000, // kilograms
		oz: 28.3495, // ounces
		lb: 453.592, // pounds
	};

	// Common ingredient densities (g/ml)
	const densities: Record<string, number> = {
		water: 1.0, // water density at room temperature
		milk: 1.03, // whole milk
		flour: 0.593, // all-purpose flour
		sugar: 0.845, // granulated sugar
		'brown sugar': 0.721, // packed brown sugar
		salt: 1.217, // table salt
		butter: 0.911, // unsalted butter
		oil: 0.918, // vegetable oil
		honey: 1.42, // pure honey
		'maple syrup': 1.37, // pure maple syrup
	};

	try {
		// Validate units
		const fromUnit = from.toLowerCase();
		const toUnit = to.toLowerCase();
		const ing = ingredient?.toLowerCase();

		// Check if units exist
		if (!volumeConversions[fromUnit] && !weightConversions[fromUnit]) {
			throw new Error(`Invalid source unit: ${from}`);
		}
		if (!volumeConversions[toUnit] && !weightConversions[toUnit]) {
			throw new Error(`Invalid target unit: ${to}`);
		}

		let result: number;

		// Same type conversion (volume to volume or weight to weight)
		if (
			(volumeConversions[fromUnit] && volumeConversions[toUnit]) ||
			(weightConversions[fromUnit] && weightConversions[toUnit])
		) {
			const conversions = volumeConversions[fromUnit] ? volumeConversions : weightConversions;
			result = (value * conversions[fromUnit]) / conversions[toUnit];
		} else {
			// Volume to weight or weight to volume conversion
			if (!ing || !densities[ing]) {
				throw new Error(
					`Ingredient is required for volume-weight conversions. Available ingredients: ${Object.keys(densities).join(', ')}`,
				);
			}

			// Convert to base units first (ml or g)
			let baseValue: number;
			if (volumeConversions[fromUnit]) {
				baseValue = value * volumeConversions[fromUnit] * densities[ing];
				result = baseValue / weightConversions[toUnit];
			} else {
				baseValue = value * weightConversions[fromUnit];
				result = baseValue / (volumeConversions[toUnit] * densities[ing]);
			}
		}

		return {
			content: [
				{
					type: 'text',
					text: `🔄 Conversion Result:\n• ${value} ${from} ${
						ingredient ? `of ${ingredient} ` : ''
					}= ${result.toFixed(2)} ${to}\n\n📝 Note: ${
						ingredient ? 'Conversion includes ingredient density' : 'Direct unit conversion'
					}`,
				},
			],
			isError: false,
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: `❌ Error: ${error instanceof Error ? error.message : 'Invalid conversion'}`,
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

// Server configuration
const server = new Server(
	{
		name: 'mcp-server/nekzus',
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const result = await handleToolCall(request.params.name, request.params.arguments ?? {});
	return result;
});

// Server startup
async function runServer() {
	try {
		const transport = new StdioServerTransport();

		// Handle messages directly
		process.stdin.on('data', async (data) => {
			try {
				const message = JSON.parse(data.toString());
				if (message.method === 'tools/call') {
					const result = await handleToolCall(message.params.name, message.params.arguments ?? {});
					const response = {
						jsonrpc: '2.0',
						result,
						id: message.id,
					};
					process.stdout.write(`${JSON.stringify(response)}\n`);
				}
			} catch (error) {
				log('[Server] Error processing message:', error);
			}
		});

		await server.connect(transport);
		log('[Server] MCP Server is running');
		log('[Server] Available tools:', TOOLS.map((t) => t.name).join(', '));

		// Handle stdin close
		process.stdin.on('close', async () => {
			log('[Server] Input stream closed');
			await cleanup();
		});

		// Add signal handlers for graceful shutdown
		process.on('SIGINT', async () => {
			log('[Server] Received SIGINT signal');
			await cleanup();
		});
		process.on('SIGTERM', async () => {
			log('[Server] Received SIGTERM signal');
			await cleanup();
		});
	} catch (error) {
		log('[Server] Failed to start MCP Server:', error);
		process.exit(1);
	}
}

// Cleanup function
async function cleanup() {
	try {
		await server.close();
		log('[Server] MCP Server stopped gracefully');
		process.exit(0);
	} catch (error) {
		log('[Server] Error during cleanup:', error);
		process.exit(1);
	}
}

// Start the server
runServer().catch((error) => log('[Server] Unhandled error:', error));
