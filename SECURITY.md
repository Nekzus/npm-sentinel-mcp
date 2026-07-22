# Security Policy

## Supported Versions

Please use the latest release of `@nekzus/mcp-server` to ensure you have the most up-to-date security patches.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of `npm-sentinel-mcp` seriously. If you discover a security vulnerability, please do not open a public issue. Instead:

1. Email the maintainers at [nekzus.dev@gmail.com](mailto:nekzus.dev@gmail.com) or submit a GitHub Private Vulnerability Report.
2. Provide a detailed description of the vulnerability and steps to reproduce it.
3. We will acknowledge your report within 24 hours and issue a security patch as soon as possible.

## Security Architecture & Defenses

This MCP server implements strict, multi-layered security controls designed to protect host systems, AI clients, and end users:

- **Strict Input Validation & Sanitization**: All package names and input arguments are validated against strict npm specification rules to block Command Injection, Path Traversal, and Cross-Site Scripting (XSS) vectors.
- **Prototype Collision Safeguards**: All internal dictionary and map lookups enforce own-property checks (`Object.prototype.hasOwnProperty`) to prevent prototype pollution and unhandled exceptions from reserved property names (e.g., `constructor`, `__proto__`).
- **Stateless & Read-Only Execution**: All 19 tools perform read-only queries against trusted public endpoints (NPM Registry, OSV.dev, deps.dev, GitHub API). The server does not write, execute, or publish code.
- **Container & Transport Security**: 
  - **STDIO Mode**: Zero open network ports listening locally by default.
  - **Docker Image**: Multi-stage build running strictly under a non-root user (`USER node`).
  - **Streamable HTTP POST**: Fully stateless HTTP execution without memory session retention.
- **Indirect Prompt Injection Mitigations (OWASP LLM01)**: Tools that fetch raw third-party content (`npmPackageReadme`, `npmChangelogAnalysis`) implement Defense-in-Depth safeguards:
  - **XML Data Demarcation**: Untrusted Markdown and release text are wrapped inside `<untrusted_external_content>` tags.
  - **Metadata Signaling**: Responses include `_meta.untrustedExternalContent = true` and `_meta.sources` arrays for programmatic client-side detection.
  - **Tool Schema & Prompt Guidance**: Tool descriptions and prompts explicitly instruct consuming LLM agents to treat returned documentation strictly as passive data.
- **Privacy Policy**: No credentials, tokens, or personal identifying information (PII) are stored or logged.
