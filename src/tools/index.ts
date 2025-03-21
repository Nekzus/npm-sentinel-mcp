import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getRandomCard } from '../utils/cards.js';
import { getCurrentDateTime } from '../utils/datetime.js';

interface ToolResponse {
	content: Array<{
		type: string;
		text: string;
		data?: unknown;
	}>;
	isError?: boolean;
}

export const greetingTool: Tool = {
	name: 'greeting',
	description: 'Generate a personalized greeting message for the specified person',
	inputSchema: {
		type: 'object',
		properties: {
			name: { type: 'string', description: 'Name of the recipient for the greeting' },
		},
		required: ['name'],
	},
	handler: async (args: { name: string }): Promise<ToolResponse> => {
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
	},
	handler: async (): Promise<ToolResponse> => {
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
	handler: async (args: { timeZone?: string; locale?: string }): Promise<ToolResponse> => {
		try {
			const { date, time, timezone } = getCurrentDateTime(args.timeZone, args.locale);
			return {
				content: [
					{
						type: 'text',
						text: `🗓️ Date: ${date}\n⏰ Time: ${time}\n🌍 Timezone: ${timezone}`,
					},
				],
			};
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: 'Error getting date and time',
					},
				],
				isError: true,
			};
		}
	},
};

export default [greetingTool, cardTool, dateTimeTool] as const;
