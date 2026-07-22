import { describe, expect, test } from 'vitest';
import { needsVersionResolution, resolvePackageVersion } from '../../src/utils/version-resolver';

describe('needsVersionResolution', () => {
	test('returns false for known dist-tags', () => {
		expect(needsVersionResolution('latest')).toBe(false);
		expect(needsVersionResolution('next')).toBe(false);
		expect(needsVersionResolution('beta')).toBe(false);
		expect(needsVersionResolution('rc')).toBe(false);
	});

	test('returns false for exact SemVer versions', () => {
		expect(needsVersionResolution('4.18.2')).toBe(false);
		expect(needsVersionResolution('1.0.0')).toBe(false);
		expect(needsVersionResolution('2.5.11-alpha.1')).toBe(false);
	});

	test('returns true for version shorthands and ranges', () => {
		expect(needsVersionResolution('2')).toBe(true);
		expect(needsVersionResolution('v4')).toBe(true);
		expect(needsVersionResolution('4.x')).toBe(true);
		expect(needsVersionResolution('^4')).toBe(true);
		expect(needsVersionResolution('~4.18')).toBe(true);
	});

	test('returns false for empty/invalid inputs', () => {
		expect(needsVersionResolution('')).toBe(false);
	});
});

describe('resolvePackageVersion', () => {
	const mockPackageData = {
		'dist-tags': {
			latest: '5.2.1',
			next: '6.0.0-rc.1',
		},
		versions: {
			'2.0.0': {},
			'2.1.0': {},
			'2.5.11': {},
			'4.0.0': {},
			'4.18.2': {},
			'4.22.2': {},
			'5.0.0': {},
			'5.2.1': {},
		},
	};

	test('resolves dist-tags directly', () => {
		expect(resolvePackageVersion(mockPackageData, 'latest')).toBe('5.2.1');
		expect(resolvePackageVersion(mockPackageData, 'next')).toBe('6.0.0-rc.1');
	});

	test('resolves exact versions', () => {
		expect(resolvePackageVersion(mockPackageData, '4.18.2')).toBe('4.18.2');
		expect(resolvePackageVersion(mockPackageData, '2.0.0')).toBe('2.0.0');
	});

	test('resolves major version shorthands', () => {
		expect(resolvePackageVersion(mockPackageData, '2')).toBe('2.5.11');
		expect(resolvePackageVersion(mockPackageData, '4')).toBe('4.22.2');
		expect(resolvePackageVersion(mockPackageData, '5')).toBe('5.2.1');
	});

	test('resolves prefixed versions (v4, 4.x, ^4, ~4.18)', () => {
		expect(resolvePackageVersion(mockPackageData, 'v4')).toBe('4.22.2');
		expect(resolvePackageVersion(mockPackageData, '4.x')).toBe('4.22.2');
		expect(resolvePackageVersion(mockPackageData, '^4')).toBe('4.22.2');
		expect(resolvePackageVersion(mockPackageData, '~4.18')).toBe('4.18.2');
	});

	test('returns fallback latest for non-matching major version', () => {
		expect(resolvePackageVersion(mockPackageData, '99')).toBe('5.2.1');
	});

	test('returns null for null/empty packageData', () => {
		expect(resolvePackageVersion(null, '2')).toBeNull();
		expect(resolvePackageVersion(undefined, '2')).toBeNull();
		expect(resolvePackageVersion({ versions: {} }, '2')).toBeNull();
	});
});
