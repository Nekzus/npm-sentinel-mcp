import * as fs from 'node:fs';
import * as path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/server';
import { DOCUMENT_ICON } from '../icons.js';

export function registerAllResources(server: McpServer, packageRoot: string): void {
	const README_PATH = path.join(packageRoot, 'README.md');
	const LLMS_FULL_TEXT_PATH = path.join(packageRoot, 'llms-full.txt');

	// Register README.md resource
	server.registerResource(
		'serverReadme',
		'doc://server/readme',
		{
			description: 'Main documentation and usage guide for this NPM Info Server.',
			mimeType: 'text/markdown',
			icons: DOCUMENT_ICON,
		},
		async (uri: URL): Promise<{ contents: { uri: string; text: string; mimeType: string }[] }> => {
			try {
				const readmeContent = fs.readFileSync(README_PATH, 'utf-8');
				return {
					contents: [
						{
							uri: uri.href,
							text: readmeContent,
							mimeType: 'text/markdown',
						},
					],
				};
			} catch (error: any) {
				console.error(`Error reading README.md for resource ${uri.href}:`, error.message);
				throw {
					code: -32002,
					message: `Resource not found or unreadable: ${uri.href}`,
					data: { uri: uri.href, cause: error.message },
				};
			}
		},
	);

	// Register llms-full.txt resource (MCP Specification)
	server.registerResource(
		'mcpSpecification',
		'doc://mcp/specification',
		{
			description:
				'The llms-full.txt content providing a comprehensive overview of the Model Context Protocol.',
			mimeType: 'text/plain',
			icons: DOCUMENT_ICON,
		},
		async (uri: URL): Promise<{ contents: { uri: string; text: string; mimeType: string }[] }> => {
			try {
				const specContent = fs.readFileSync(LLMS_FULL_TEXT_PATH, 'utf-8');
				return {
					contents: [
						{
							uri: uri.href,
							text: specContent,
							mimeType: 'text/plain',
						},
					],
				};
			} catch (error: any) {
				console.error(`Error reading llms-full.txt for resource ${uri.href}:`, error.message);
				throw {
					code: -32002,
					message: `Resource not found or unreadable: ${uri.href}`,
					data: { uri: uri.href, cause: error.message },
				};
			}
		},
	);
}
