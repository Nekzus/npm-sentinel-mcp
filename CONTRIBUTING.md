# Contributing to npm-sentinel-mcp

Thank you for your interest in contributing to `@nekzus/npm-sentinel-mcp`! We welcome contributions, bug reports, and feature requests from the community.

---

## 1. Governance & Standards

To maintain supply chain integrity and code quality, all contributors must adhere to the following standards:

1. **Mandatory GPG Signing:** All local commits must be cryptographically signed using your GPG key (`git commit -S -m "..."`). Unsigned commits will be rejected by branch protection rules.
2. **Conventional Commits:** Commit messages must follow the [Conventional Commits](https://conventionalcommits.org) specification:
   - `fix(scope): description` -> Triggers a PATCH release
   - `feat(scope): description` -> Triggers a MINOR release
   - `feat(scope)!: description` or `BREAKING CHANGE:` -> Triggers a MAJOR release
   - `docs:`, `chore:`, `refactor:`, `test:` -> Maintenance without release bump
3. **Language Standard:** All source code, inline documentation, commit messages, and PR descriptions must be written in **English**.

---

## 2. Development Workflow

### Step 1: Clone and Install
```bash
git clone https://github.com/Nekzus/npm-sentinel-mcp.git
cd npm-sentinel-mcp
pnpm install
```

### Step 2: Create a Feature Branch
Always branch off the `alpha` integration branch for development:
```bash
git checkout alpha
git pull origin alpha
git checkout -b feat/my-new-mcp-tool
```

### Step 3: Local Verification
Before opening a Pull Request, verify that all linting, formatting, and unit tests pass cleanly:
```bash
pnpm run lint
pnpm run test
pnpm run build:stdio
```

### Step 4: Submit a Pull Request
Push your branch to GitHub and open a Pull Request targeting the `alpha` branch. Fill out the PR template checklist completely.
