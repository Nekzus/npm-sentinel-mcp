import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function processTemplates() {
	try {
		console.log('🔄 Procesando templates localmente...');

		// 1. Leer versión de package.json
		const packagePath = path.join(projectRoot, 'package.json');
		const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
		const version = packageJson.version;

		console.log(`📦 Versión actual: ${version}`);

		// 2. Procesar index.ts
		const indexPath = path.join(projectRoot, 'index.ts');
		let indexContent = fs.readFileSync(indexPath, 'utf8');

		if (indexContent.includes('{{VERSION}}')) {
			indexContent = indexContent.replace(/\{\{VERSION\}\}/g, version);
			fs.writeFileSync(indexPath, indexContent);
			console.log('✅ Templates procesados en index.ts');
		}

		// 3. Procesar server.json
		const serverPath = path.join(projectRoot, 'server.json');
		let serverContent = fs.readFileSync(serverPath, 'utf8');

		if (serverContent.includes('{{VERSION}}')) {
			serverContent = serverContent.replace(/\{\{VERSION\}\}/g, version);
			fs.writeFileSync(serverPath, serverContent);
			console.log('✅ Templates procesados en server.json');
		}

		// 4. Rebuild
		console.log('🔨 Rebuilding...');
		execSync('npm run build:stdio', { cwd: projectRoot, stdio: 'inherit' });

		console.log('🎉 Templates procesados y rebuild completado!');
		console.log(`📋 Versión final: ${version}`);
	} catch (error) {
		console.error('❌ Error procesando templates:', error.message);
		process.exit(1);
	}
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
	processTemplates();
}

export { processTemplates };
