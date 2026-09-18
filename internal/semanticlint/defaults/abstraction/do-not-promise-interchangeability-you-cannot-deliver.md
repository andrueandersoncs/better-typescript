---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not promise interchangeability you cannot deliver

Implementations of the same contract must honor the same guarantees. When capabilities differ meaningfully, expose the distinction or narrow the contract rather than relying on implementation-specific knowledge, downcasts, or surprising “unsupported operation” failures.

### Implement the boundary
