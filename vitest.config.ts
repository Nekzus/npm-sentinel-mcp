/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
		exclude: ['node_modules', 'dist', '**/__tests__/utils/test-helpers.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'json-summary'],
			include: ['*.ts'],
			exclude: [
				'node_modules/**',
				'dist/**',
				'**/*.d.ts',
				'**/*.test.ts',
				'**/*.spec.ts',
				'vitest.config.ts',
			],
		},
	},
});
