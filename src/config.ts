import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const configSchema = z.object({
	NPM_REGISTRY_URL: z.string().optional().describe('URL of the NPM registry to use'),
});

export let NPM_REGISTRY_URL = 'https://registry.npmjs.org';

export function setNpmRegistryUrl(url: string): void {
	NPM_REGISTRY_URL = url.replace(/\/$/, '');
}

export function getPackageRootAndVersion(): { packageRoot: string; serverVersion: string } {
	let __filename: string;
	let __dirname = '';

	try {
		__filename = fileURLToPath(import.meta.url);
		__dirname = path.dirname(__filename);
	} catch {
		__dirname = process.cwd();
	}

	let packageRoot = process.cwd();
	if (__dirname && fs.existsSync(path.join(__dirname, 'package.json'))) {
		packageRoot = __dirname;
	} else if (__dirname && fs.existsSync(path.join(__dirname, '..', 'package.json'))) {
		packageRoot = path.join(__dirname, '..');
	} else if (__dirname && fs.existsSync(path.join(__dirname, '..', '..', 'package.json'))) {
		packageRoot = path.join(__dirname, '..', '..');
	}

	let serverVersion = '1.0.0';
	try {
		const packageJsonPath = path.join(packageRoot, 'package.json');
		if (fs.existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
			serverVersion = packageJson.version;
		}
	} catch (error) {
		console.error('Error reading package.json version:', error);
	}

	return { packageRoot, serverVersion };
}
