const KNOWN_DIST_TAGS = new Set([
	'latest',
	'next',
	'beta',
	'rc',
	'canary',
	'alpha',
	'dev',
	'experimental',
	'nightly',
	'stable',
]);

const EXACT_SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Checks if a requested version string requires resolution against the package manifest/packument.
 * Returns false for known dist-tags and exact SemVer versions (e.g., '1.2.3').
 * Returns true for version shorthands or ranges (e.g., '2', 'v4', '4.x', '^4', '~4.18').
 */
export function needsVersionResolution(version: string): boolean {
	if (!version) return false;
	const trimmed = version.trim();
	if (KNOWN_DIST_TAGS.has(trimmed.toLowerCase())) return false;
	if (EXACT_SEMVER_REGEX.test(trimmed)) return false;
	return true;
}

/**
 * Resolves a requested version string (shorthand, tag, range, exact) against package manifest data.
 */
export function resolvePackageVersion(
	packageData:
		| {
				versions?: Record<string, any>;
				'dist-tags'?: Record<string, string>;
		  }
		| null
		| undefined,
	requestedVersion: string,
): string | null {
	if (!packageData || !requestedVersion) return null;
	const versionsObj = packageData.versions || {};
	const availableVersions = Object.keys(versionsObj);
	if (availableVersions.length === 0) return null;

	const distTags = packageData['dist-tags'] || {};

	// 1. Direct dist-tag match
	if (Object.hasOwn(distTags, requestedVersion)) {
		return distTags[requestedVersion];
	}

	// 2. Exact version match
	if (Object.hasOwn(versionsObj, requestedVersion)) {
		return requestedVersion;
	}

	// 3. Clean and match shorthands/ranges (e.g., '2', 'v2', '2.x', '^2', '~2.5')
	const cleaned = requestedVersion
		.replace(/^v/i, '')
		.replace(/[.*]+x$/i, '')
		.replace(/[\^~]/, '')
		.trim();

	if (cleaned) {
		const matchingVersions = availableVersions.filter((v) => {
			return v === cleaned || v.startsWith(`${cleaned}.`);
		});

		if (matchingVersions.length > 0) {
			matchingVersions.sort((a, b) => {
				const partsA = a.split('-')[0].split('.').map(Number);
				const partsB = b.split('-')[0].split('.').map(Number);
				for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
					const valA = partsA[i] || 0;
					const valB = partsB[i] || 0;
					if (valA !== valB) return valA - valB;
				}
				return a.localeCompare(b);
			});
			return matchingVersions.pop() || null;
		}
	}

	// 4. Fallback to dist-tag latest or highest available version
	return distTags.latest || availableVersions.sort().pop() || null;
}
