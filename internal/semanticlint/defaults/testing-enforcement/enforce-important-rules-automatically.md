---
globs:
  - "package.json"
  - ".github/**/*.{yml,yaml}"
  - "scripts/**/*.{ts,js,mjs,cjs}"
  - "**/*config*.{ts,js,mjs,cjs,json}"
---
# Enforce important rules automatically

Make the root `bun run check` orchestrate formatting checks, lint, independent type checking, suitable tests, and architecture checks. Configure import and dependency-graph checks to reject prohibited imports, undeclared dependencies, cycles, and browser/server boundary violations automatically.
