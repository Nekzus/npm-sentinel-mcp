# Security Policy

## Supported Versions

Use the latest version of this project to ensure you have the most up-to-date security patches.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please do not open a public issue. instead:

1.  Email the maintainer at [nekzus.dev@gmail.com](mailto:nekzus.dev@gmail.com).
2.  Provide a detailed description of the vulnerability and steps to reproduce it.
3.  We will acknowledge your report and work on a fix as soon as possible.

## Security Measures

This server implements several security layers to protect the host system and the user:

-   **Input Validation**: All package names and inputs are strictly validated against a regex allowlist to prevent Command Injection, Path Traversal, and SSRF attacks.
-   **Dependency Scanning**: The project is regularly audited using `npm audit` and commercial scanning tools.
-   **Safe Execution**: The Docker container runs as a non-root user.
