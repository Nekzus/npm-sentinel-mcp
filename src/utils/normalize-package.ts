/**
 * Safe extractors and normalizers for polymorphic npm package metadata fields.
 * Conforms to the official npm package.json specification and real-world registry payloads.
 */

export function extractAuthorString(author: unknown): string | null {
	if (!author) return null;
	if (typeof author === 'string') return author;
	if (
		typeof author === 'object' &&
		author !== null &&
		'name' in author &&
		typeof (author as { name?: unknown }).name === 'string'
	) {
		return (author as { name: string }).name;
	}
	return null;
}

export function extractLicenseString(license: unknown): string | null {
	if (!license) return null;
	if (typeof license === 'string') return license;
	if (
		typeof license === 'object' &&
		license !== null &&
		'type' in license &&
		typeof (license as { type?: unknown }).type === 'string'
	) {
		return (license as { type: string }).type;
	}
	if (Array.isArray(license) && license.length > 0) {
		const first = license[0];
		if (typeof first === 'string') return first;
		if (
			typeof first === 'object' &&
			first !== null &&
			'type' in first &&
			typeof first.type === 'string'
		) {
			return first.type;
		}
	}
	return null;
}

export function extractRepositoryUrl(repo: unknown): string | null {
	if (!repo) return null;
	if (typeof repo === 'string') {
		if (
			repo.startsWith('git+') ||
			repo.startsWith('http://') ||
			repo.startsWith('https://') ||
			repo.startsWith('git://')
		) {
			return repo;
		}
		// Shortcut formats e.g. "github:user/repo", "user/repo", "gitlab:user/repo"
		if (repo.includes(':')) {
			const [provider, path] = repo.split(':');
			if (provider === 'github' || provider === 'gitlab' || provider === 'bitbucket') {
				return `https://${provider}.com/${path}`;
			}
		}
		if (repo.split('/').length === 2 && !repo.includes(':')) {
			return `https://github.com/${repo}`;
		}
		return repo;
	}
	if (
		typeof repo === 'object' &&
		repo !== null &&
		'url' in repo &&
		typeof (repo as { url?: unknown }).url === 'string'
	) {
		return (repo as { url: string }).url;
	}
	return null;
}

export function extractBugsUrl(bugs: unknown): string | null {
	if (!bugs) return null;
	if (typeof bugs === 'string') return bugs;
	if (
		typeof bugs === 'object' &&
		bugs !== null &&
		'url' in bugs &&
		typeof (bugs as { url?: unknown }).url === 'string'
	) {
		return (bugs as { url: string }).url;
	}
	return null;
}

export function extractTypesPath(pkg: Record<string, any> | null | undefined): string | null {
	if (!pkg || typeof pkg !== 'object') return null;
	if (typeof pkg.types === 'string') return pkg.types;
	if (typeof pkg.typings === 'string') return pkg.typings;

	// Modern Subpath Exports (Node.js / TS 4.7+)
	if (pkg.exports && typeof pkg.exports === 'object') {
		const rootExport = pkg.exports['.'];
		if (
			typeof rootExport === 'string' &&
			(rootExport.endsWith('.d.ts') || rootExport.endsWith('.d.mts'))
		) {
			return rootExport;
		}
		if (typeof rootExport === 'object' && rootExport !== null) {
			if (typeof rootExport.types === 'string') return rootExport.types;
			if (
				typeof rootExport.import === 'object' &&
				rootExport.import !== null &&
				typeof rootExport.import.types === 'string'
			) {
				return rootExport.import.types;
			}
			if (
				typeof rootExport.require === 'object' &&
				rootExport.require !== null &&
				typeof rootExport.require.types === 'string'
			) {
				return rootExport.require.types;
			}
			if (
				typeof rootExport.default === 'object' &&
				rootExport.default !== null &&
				typeof rootExport.default.types === 'string'
			) {
				return rootExport.default.types;
			}
		}
		if (typeof pkg.exports.types === 'string') return pkg.exports.types;
	}
	return null;
}
