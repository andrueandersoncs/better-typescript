---
globs:
  - "**/package.json"
  - "bun.lock"
---
# Centralize versions that must move together

Use Bun catalogs to coordinate versions that must be upgraded together, including Effect and its integrations, TypeScript, and the frontend framework. Record the chosen Effect major and use documentation and examples for that major, but select mutually compatible Effect package versions rather than forcing them to share the same numeric version.
