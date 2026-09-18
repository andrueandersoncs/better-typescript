---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---
# Import packages through public exports

Every package must declare `package.json` exports and expose only intentional public entry points and subpaths. Import another workspace package through those exports. Do not use cross-package relative imports, import another package’s `src/` files, or use TypeScript path aliases to bypass workspace package resolution.
