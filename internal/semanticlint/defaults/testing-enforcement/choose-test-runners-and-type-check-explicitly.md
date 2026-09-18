---
globs:
  - "package.json"
  - "**/tsconfig*.json"
  - "**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/{test,tests,__tests__}/**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Choose test runners and type-check explicitly

Name each test suite and command for the runner that executes it. Do not infer `bun:test` from the use of Bun; Effect's Vitest integration runs under Vitest. Exercise runtime-specific code on the production runtime. Run an independent TypeScript check because Bun strips TypeScript syntax instead of checking types.
