import { McpServer } from '@modelcontextprotocol/server';
import type { z } from 'zod';
import { configSchema, getPackageRootAndVersion, setNpmRegistryUrl } from './config.js';
import { registerAllPrompts } from './prompts/index.js';
import { registerAllResources } from './resources/index.js';
import { registerAllTools } from './tools/index.js';

export { configSchema } from './config.js';

export default function createServer({ config }: { config: z.infer<typeof configSchema> }) {
	if (config.NPM_REGISTRY_URL) {
		setNpmRegistryUrl(config.NPM_REGISTRY_URL);
	}

	const { packageRoot, serverVersion } = getPackageRootAndVersion();

	const server = new McpServer({
		name: 'npm-sentinel-mcp',
		version: serverVersion,
	});

	registerAllResources(server, packageRoot);
	registerAllPrompts(server);
	registerAllTools(server);

	return server.server;
}
