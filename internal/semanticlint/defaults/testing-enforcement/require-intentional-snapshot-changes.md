---
globs:
  - "**/*.snap"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__,e2e}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Require intentional snapshot changes

Every added or updated snapshot must correspond to an intended observable behavior change. Do not silently bless broad regenerated output or use a large snapshot where a focused assertion would state the business contract more clearly.

Do not report stable, focused snapshots whose changed values are explained by the accompanying behavior change.