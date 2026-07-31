## Description

<!-- Provide a clear summary of the changes introduced in this Pull Request and the business/technical rationale. -->

## Related Issues

<!-- Link related issues or tickets. Example: Fixes #123 or Closes #45 -->
- Fixes #

## Type of Change

- [ ] `fix`: Bug fix (Patch release `1.25.X`)
- [ ] `feat`: New feature or tool capability (Minor release `1.26.0`)
- [ ] `BREAKING CHANGE`: Incompatible API or schema change (Major release `2.0.0`)
- [ ] `perf`: Performance optimization
- [ ] `docs` / `chore` / `refactor` / `ci`: Maintenance with no release bump

## DevSecOps & Security Checklist

- [ ] All local commits are GPG signed (`git commit -S`).
- [ ] Commit messages follow [Conventional Commits](https://conventionalcommits.org) formatting.
- [ ] No hardcoded API keys, secrets, or PII are present in source code.
- [ ] Input validation and OWASP LLM01 / prompt injection safeguards are enforced.
- [ ] Supply chain dependency audit passed (`pnpm audit`).

## Verification & Quality Assurance

- [ ] Automated Vitest unit test suite passes (`pnpm run test`).
- [ ] Biome linting and formatting checks pass (`pnpm run lint`).
- [ ] TypeScript compilation builds cleanly (`pnpm run build:stdio`).

## Documentation Impact

- [ ] `README.md` or API documentation updated if applicable.
