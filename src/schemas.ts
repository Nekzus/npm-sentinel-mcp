import { z } from 'zod';

export const NpmMaintainerSchema = z
	.object({
		name: z.string(),
		email: z.string().optional(),
		url: z.string().optional(),
	})
	.loose();

export const NpmPackageVersionSchema = z
	.object({
		name: z.string(),
		version: z.string(),
		description: z.string().optional(),
		author: z
			.union([
				z.string(),
				z
					.object({
						name: z.string().optional(),
						email: z.string().optional(),
						url: z.string().optional(),
					})
					.loose(),
			])
			.optional(),
		license: z.string().optional(),
		repository: z
			.object({
				type: z.string().optional(),
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		bugs: z
			.object({
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		homepage: z.string().optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
		devDependencies: z.record(z.string(), z.string()).optional(),
		peerDependencies: z.record(z.string(), z.string()).optional(),
		types: z.string().optional(),
		typings: z.string().optional(),
		dist: z
			.object({ shasum: z.string().optional(), tarball: z.string().optional() })
			.loose()
			.optional(),
	})
	.loose();

export const NpmPackageInfoSchema = z
	.object({
		name: z.string(),
		'dist-tags': z.record(z.string(), z.string()),
		versions: z.record(z.string(), NpmPackageVersionSchema),
		time: z.record(z.string(), z.string()).optional(),
		repository: z
			.object({
				type: z.string().optional(),
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		bugs: z
			.object({
				url: z.string().optional(),
			})
			.loose()
			.optional(),
		homepage: z.string().optional(),
		maintainers: z.array(NpmMaintainerSchema).optional(),
	})
	.loose();

export const NpmPackageDataSchema = z
	.object({
		name: z.string(),
		version: z.string(),
		description: z.string().optional(),
		license: z.string().optional(),
		dependencies: z.record(z.string(), z.string()).optional(),
		devDependencies: z.record(z.string(), z.string()).optional(),
		peerDependencies: z.record(z.string(), z.string()).optional(),
		types: z.string().optional(),
		typings: z.string().optional(),
	})
	.loose();

export const BundlephobiaDataSchema = z.object({
	size: z.number(),
	gzip: z.number(),
	dependencyCount: z.number(),
});

export const NpmDownloadsDataSchema = z.object({
	downloads: z.number(),
	start: z.string(),
	end: z.string(),
	package: z.string(),
});

export const NpmSearchResultSchema = z
	.object({
		objects: z.array(
			z.object({
				package: z.object({
					name: z.string(),
					version: z.string(),
					description: z.string().optional(),
					keywords: z.array(z.string()).optional(),
					publisher: z
						.object({
							username: z.string(),
							email: z.string().optional(),
						})
						.optional(),
					links: z
						.object({
							npm: z.string().optional(),
							homepage: z.string().optional(),
							repository: z.string().optional(),
							bugs: z.string().optional(),
						})
						.optional(),
					date: z.string().optional(),
				}),
				score: z.object({
					final: z.number(),
					detail: z.object({
						quality: z.number(),
						popularity: z.number(),
						maintenance: z.number(),
					}),
				}),
				searchScore: z.number(),
			}),
		),
		total: z.number(),
	})
	.loose();

export type NpmPackageInfo = z.infer<typeof NpmPackageInfoSchema>;
export type NpmPackageData = z.infer<typeof NpmPackageDataSchema>;
export type BundlephobiaData = z.infer<typeof BundlephobiaDataSchema>;
export type NpmDownloadsData = z.infer<typeof NpmDownloadsDataSchema>;

export function isNpmPackageInfo(data: unknown): data is NpmPackageInfo {
	return (
		typeof data === 'object' &&
		data !== null &&
		(!('maintainers' in data) ||
			(Array.isArray((data as NpmPackageInfo).maintainers) &&
				((data as NpmPackageInfo).maintainers?.every(
					(m) =>
						typeof m === 'object' &&
						m !== null &&
						'name' in m &&
						'email' in m &&
						typeof m.name === 'string' &&
						typeof m.email === 'string',
				) ??
					true)))
	);
}

export function isNpmPackageData(data: unknown): data is z.infer<typeof NpmPackageDataSchema> {
	try {
		const result = NpmPackageDataSchema.safeParse(data);
		if (!result.success) {
			console.error(
				'isNpmPackageData validation failed:',
				JSON.stringify(result.error.issues, null, 2),
			);
		}
		return result.success;
	} catch (e) {
		console.error('isNpmPackageData threw exception:', e);
		return false;
	}
}

export function isBundlephobiaData(data: unknown): data is z.infer<typeof BundlephobiaDataSchema> {
	try {
		return BundlephobiaDataSchema.parse(data) !== null;
	} catch {
		return false;
	}
}

export function isNpmDownloadsData(data: unknown): data is z.infer<typeof NpmDownloadsDataSchema> {
	try {
		const result = NpmDownloadsDataSchema.safeParse(data);
		if (!result.success) {
			console.error(
				'isNpmDownloadsData validation failed:',
				JSON.stringify(result.error.issues, null, 2),
			);
		}
		return result.success;
	} catch {
		return false;
	}
}

export function isValidNpmPackageName(name: string): boolean {
	const npmPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
	return (
		npmPackageRegex.test(name) &&
		name.length <= 214 &&
		!name.startsWith('_') &&
		!name.startsWith('.')
	);
}

export const SearchQuerySchema = z
	.string()
	.trim()
	.min(1, 'Search query cannot be empty')
	.max(100, 'Search query cannot exceed 100 characters')
	.refine((val) => !/[\0\r\n\t]/.test(val), {
		message: 'Search query contains disallowed control characters',
	});

export const PackageListSchema = z
	.array(z.string())
	.min(1, 'At least one package name must be provided')
	.max(25, 'Maximum of 25 packages allowed per batch request');
