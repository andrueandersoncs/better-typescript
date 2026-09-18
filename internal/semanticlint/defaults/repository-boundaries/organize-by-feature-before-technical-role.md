---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---
# Organize by feature before technical role

Organize feature code in feature folders that colocate its model, operations, adapters, and tests. Keep genuinely generic UI primitives separate, but do not place feature code in repository-wide buckets organized by technical role.
