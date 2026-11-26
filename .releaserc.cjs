const { execSync } = require('node:child_process');

function resolveCurrentBranch() {
	if (process.env.GITHUB_REF_NAME) {
		return process.env.GITHUB_REF_NAME;
	}
	try {
		return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return 'main';
	}
}

const currentBranch = resolveCurrentBranch();
const isAlpha = currentBranch === 'alpha';
const changelogFile = isAlpha ? 'CHANGELOG.alpha.md' : 'CHANGELOG.md';
const changelogTitle = isAlpha
	? '# Changelog (Alpha)\n\nAll notable pre-release changes for the `alpha` channel will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.'
	: '# Changelog\n\nAll notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.';

module.exports = {
	// biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release tagFormat placeholder
	tagFormat: '${version}',
	branches: ['main', { name: 'alpha', prerelease: 'alpha' }],
	plugins: [
		'@semantic-release/commit-analyzer',
		[
			'@semantic-release/release-notes-generator',
			{
				preset: 'conventionalcommits',
				presetConfig: {
					types: [
						{ type: 'feat', section: 'Features' },
						{ type: 'fix', section: 'Bug Fixes' },
						{ type: 'perf', section: 'Performance Improvements' },
						{ type: 'revert', section: 'Reverts' },
						{ type: 'docs', section: 'Documentation' },
						{ type: 'style', section: 'Styles' },
						{ type: 'refactor', section: 'Code Refactoring' },
						{ type: 'test', section: 'Tests' },
						{ type: 'build', section: 'Build System' },
						{ type: 'ci', section: 'Continuous Integration', hidden: true },
						{ type: 'chore', hidden: true },
					],
				},
			},
		],
		[
			'@semantic-release/changelog',
			{
				changelogFile,
				changelogTitle,
			},
		],
		'@semantic-release/npm',
		[
			'@semantic-release-extras/verified-git-commit',
			{
				assets: ['package.json', changelogFile, 'server.json', 'Dockerfile'],
			},
		],
		'@semantic-release/github',
	],
};
