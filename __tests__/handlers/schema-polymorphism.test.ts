import { describe, expect, it } from 'vitest';
import {
	extractAuthorString,
	extractBugsUrl,
	extractLicenseString,
	extractRepositoryUrl,
	extractTypesPath,
	isNpmPackageData,
	isNpmPackageInfo,
	isNpmPackageVersionData,
	NpmBugsSchema,
	NpmLicenseSchema,
	NpmPackageDataSchema,
	NpmPackageInfoSchema,
	NpmPackageVersionSchema,
	NpmPersonSchema,
	NpmRepositorySchema,
} from '../../src/schemas.js';

describe('Schema Polymorphism & Field Extraction Tests', () => {
	describe('NpmBugsSchema', () => {
		it('should accept string URLs (e.g. Tailwind v4, Lucide)', () => {
			const strBugs = 'https://github.com/tailwindlabs/tailwindcss/issues';
			const res = NpmBugsSchema.safeParse(strBugs);
			expect(res.success).toBe(true);
			expect(extractBugsUrl(strBugs)).toBe(strBugs);
		});

		it('should accept object bugs format (e.g. React, Next.js)', () => {
			const objBugs = { url: 'https://github.com/facebook/react/issues', email: 'react@fb.com' };
			const res = NpmBugsSchema.safeParse(objBugs);
			expect(res.success).toBe(true);
			expect(extractBugsUrl(objBugs)).toBe('https://github.com/facebook/react/issues');
		});

		it('should handle undefined / null bugs gracefully', () => {
			expect(NpmBugsSchema.safeParse(undefined).success).toBe(true);
			expect(extractBugsUrl(undefined)).toBeNull();
			expect(extractBugsUrl(null)).toBeNull();
		});
	});

	describe('NpmRepositorySchema', () => {
		it('should accept string repository shortcuts', () => {
			const strRepo = 'github:tailwindlabs/tailwindcss';
			const res = NpmRepositorySchema.safeParse(strRepo);
			expect(res.success).toBe(true);
			expect(extractRepositoryUrl(strRepo)).toBe('https://github.com/tailwindlabs/tailwindcss');
		});

		it('should accept shorthand owner/repo string', () => {
			const strRepo = 'tailwindlabs/tailwindcss';
			expect(extractRepositoryUrl(strRepo)).toBe('https://github.com/tailwindlabs/tailwindcss');
		});

		it('should accept object repository with directory', () => {
			const objRepo = {
				type: 'git',
				url: 'https://github.com/tailwindlabs/tailwindcss.git',
				directory: 'packages/tailwindcss',
			};
			const res = NpmRepositorySchema.safeParse(objRepo);
			expect(res.success).toBe(true);
			expect(extractRepositoryUrl(objRepo)).toBe('https://github.com/tailwindlabs/tailwindcss.git');
		});
	});

	describe('NpmLicenseSchema', () => {
		it('should accept string SPDX license', () => {
			const res = NpmLicenseSchema.safeParse('MIT');
			expect(res.success).toBe(true);
			expect(extractLicenseString('MIT')).toBe('MIT');
		});

		it('should accept legacy object license', () => {
			const objLicense = { type: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' };
			const res = NpmLicenseSchema.safeParse(objLicense);
			expect(res.success).toBe(true);
			expect(extractLicenseString(objLicense)).toBe('Apache-2.0');
		});

		it('should accept legacy array license', () => {
			const arrLicense = [{ type: 'MIT' }, { type: 'GPL-3.0' }];
			const res = NpmLicenseSchema.safeParse(arrLicense);
			expect(res.success).toBe(true);
			expect(extractLicenseString(arrLicense)).toBe('MIT');
		});
	});

	describe('NpmPersonSchema & Author Extraction', () => {
		it('should accept string author', () => {
			const strAuthor = 'Eric Fennis';
			const res = NpmPersonSchema.safeParse(strAuthor);
			expect(res.success).toBe(true);
			expect(extractAuthorString(strAuthor)).toBe('Eric Fennis');
		});

		it('should accept object author', () => {
			const objAuthor = { name: 'Adam Wathan', email: 'adam@example.com' };
			const res = NpmPersonSchema.safeParse(objAuthor);
			expect(res.success).toBe(true);
			expect(extractAuthorString(objAuthor)).toBe('Adam Wathan');
		});
	});

	describe('Modern TypeScript Types Extraction (Subpath Exports)', () => {
		it('should extract types from root types field', () => {
			const pkg = { types: './index.d.ts' };
			expect(extractTypesPath(pkg)).toBe('./index.d.ts');
		});

		it('should extract types from root typings field', () => {
			const pkg = { typings: './dist/typings.d.ts' };
			expect(extractTypesPath(pkg)).toBe('./dist/typings.d.ts');
		});

		it('should extract types from exports["."].types', () => {
			const pkg = {
				name: 'tailwindcss',
				exports: {
					'.': {
						types: './index.d.ts',
						import: './index.mjs',
					},
				},
			};
			expect(extractTypesPath(pkg)).toBe('./index.d.ts');
		});

		it('should extract types from exports["."].import.types', () => {
			const pkg = {
				name: 'modern-lib',
				exports: {
					'.': {
						import: {
							types: './dist/index.d.mts',
							default: './dist/index.mjs',
						},
					},
				},
			};
			expect(extractTypesPath(pkg)).toBe('./dist/index.d.mts');
		});

		it('should extract types from direct string export ending in .d.ts', () => {
			const pkg = {
				name: 'types-lib',
				exports: {
					'.': './dist/types.d.ts',
				},
			};
			expect(extractTypesPath(pkg)).toBe('./dist/types.d.ts');
		});
	});

	describe('Full Package Manifest & Version Schema Validation', () => {
		it('should successfully validate Tier-1 packages with string bugs (Tailwind CSS v4 sample)', () => {
			const tailwindSample = {
				name: 'tailwindcss',
				version: '4.0.0',
				description: 'A utility-first CSS framework for rapid UI development.',
				license: 'MIT',
				repository: {
					type: 'git',
					url: 'https://github.com/tailwindlabs/tailwindcss.git',
					directory: 'packages/tailwindcss',
				},
				bugs: 'https://github.com/tailwindlabs/tailwindcss/issues',
				exports: {
					'.': {
						types: './index.d.ts',
						import: './index.mjs',
					},
				},
				dependencies: {
					'@tailwindcss/node': '^4.0.0',
				},
			};

			const parseResult = NpmPackageVersionSchema.safeParse(tailwindSample);
			expect(parseResult.success).toBe(true);
			expect(isNpmPackageVersionData(tailwindSample)).toBe(true);
		});

		it('should successfully validate Lucide React sample', () => {
			const lucideSample = {
				name: 'lucide-react',
				version: '1.0.0',
				author: 'Eric Fennis',
				license: 'ISC',
				bugs: 'https://github.com/lucide-icons/lucide/issues',
				repository: {
					type: 'git',
					url: 'https://github.com/lucide-icons/lucide.git',
					directory: 'packages/lucide-react',
				},
				types: './dist/lucide-react.d.ts',
			};

			expect(NpmPackageVersionSchema.safeParse(lucideSample).success).toBe(true);
			expect(isNpmPackageVersionData(lucideSample)).toBe(true);
		});

		it('should validate package data with NpmPackageDataSchema and isNpmPackageData', () => {
			const pkgDataSample = {
				name: 'tailwindcss',
				version: '4.0.0',
				description: 'Tailwind CSS',
				license: 'MIT',
				dependencies: { clsx: '^2.0.0' },
			};
			expect(NpmPackageDataSchema.safeParse(pkgDataSample).success).toBe(true);
			expect(isNpmPackageData(pkgDataSample)).toBe(true);
		});

		it('should validate full packument structure with isNpmPackageInfo and NpmPackageInfoSchema', () => {
			const packumentSample = {
				name: 'lucide-react',
				'dist-tags': { latest: '1.0.0' },
				versions: {
					'1.0.0': {
						name: 'lucide-react',
						version: '1.0.0',
						bugs: 'https://github.com/lucide-icons/lucide/issues',
					},
				},
				maintainers: [{ name: 'ericfennis' }],
			};

			expect(NpmPackageInfoSchema.safeParse(packumentSample).success).toBe(true);
			expect(isNpmPackageInfo(packumentSample)).toBe(true);
		});
	});
});
