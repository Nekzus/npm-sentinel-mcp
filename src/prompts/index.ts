import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { NPM_SECURITY_ICON } from '../icons.js';

export function registerAllPrompts(server: McpServer): void {
	server.registerPrompt(
		'analyze-package',
		{
			description: 'Analyze an NPM package for security and quality',
			argsSchema: z.object({
				package: z.string().describe('Name of the npm package to analyze'),
			}),
			icons: NPM_SECURITY_ICON,
		},
		({ package: pkgName }) => ({
			messages: [
				{
					role: 'user',
					content: {
						type: 'text',
						text: `Please analyze the npm package "${pkgName}". Check for vulnerabilities, maintenance status, and recent issues. Use the available tools to gather information.`,
					},
				},
			],
		}),
	);
}
