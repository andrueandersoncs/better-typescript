---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---
# Enforce acyclic dependency direction

Keep dependencies acyclic and point them inward: transport and UI adapters depend on application operations, and application operations depend on domain rules. Infrastructure must implement domain service interfaces, and composition code must supply those implementations.

Domain code must not depend on routers, UI frameworks, database clients, or application configuration. Cross-feature workflows must call the other feature’s public application operations, never its repositories or tables.
