import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { TextContent, Tool } from '@modelcontextprotocol/sdk/types.js';
import { getRandomCard } from '../utils/cards.js';
import { getCurrentDateTime } from '../utils/datetime.js';

type RequestHandlerExtra = Parameters<Server['setRequestHandler']>[1];
type HandlerResponse = { content: TextContent[]; _meta?: unknown; isError?: boolean };
type JsonSchema = { type: 'object'; properties?: Record<string, unknown>; required?: string[] };

export const greetingTool: Tool = {
	name: 'greeting',
	description: 'Generate a personalized greeting message for the specified person',
	inputSchema: {
		type: 'object',
		properties: {
			name: { type: 'string', description: 'Name of the recipient for the greeting' },
		},
		required: ['name'],
	} as JsonSchema,
	handler: async (
		args: { name: string },
		_extra: RequestHandlerExtra,
	): Promise<HandlerResponse> => {
		try {
			return {
				content: [
					{
						type: 'text',
						text: `👋 Hello ${args.name}! Welcome to the MCP server!`,
					},
				],
			};
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: `Error generating greeting for ${args.name}`,
					},
				],
				isError: true,
			};
		}
	},
};

export const cardTool: Tool = {
	name: 'card',
	description: 'Draw a random card from a standard 52-card poker deck',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	} as JsonSchema,
	handler: async (
		_args: Record<string, never>,
		_extra: RequestHandlerExtra,
	): Promise<HandlerResponse> => {
		try {
			const card = getRandomCard();
			return {
				content: [
					{
						type: 'text',
						text: `🎴 You drew: ${card.value} of ${card.suit}`,
					},
				],
			};
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: 'Error drawing card from deck',
					},
				],
				isError: true,
			};
		}
	},
};

export const dateTimeTool: Tool = {
	name: 'datetime',
	description: 'Get current date and time for a specific timezone and locale',
	inputSchema: {
		type: 'object',
		properties: {
			timeZone: {
				type: 'string',
				description: 'Timezone identifier (e.g., America/New_York, Europe/London, Asia/Tokyo)',
			},
			locale: {
				type: 'string',
				description: 'Locale identifier (e.g., en-US, es-ES, fr-FR)',
			},
		},
	} as JsonSchema,
	handler: async (
		args: { timeZone?: string; locale?: string },
		_extra: RequestHandlerExtra,
	): Promise<HandlerResponse> => {
		try {
			const { date, time, timeZone } = getCurrentDateTime(args);
			return {
				content: [
					{
						type: 'text',
						text: `🗓️ Date: ${date}\n⏰ Time: ${time}\n🌍 Timezone: ${timeZone}`,
					},
				],
			};
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: 'Error retrieving date and time information',
					},
				],
				isError: true,
			};
		}
	},
};

// Export all available tools
const availableTools = [greetingTool, cardTool, dateTimeTool] as const;
export default availableTools;
