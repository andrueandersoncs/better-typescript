---
globs:
  - "**/package.json"
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Declare dependencies in every consuming workspace

Every workspace must declare each runtime package it imports in its own dependencies instead of relying on root installation or hoisting. Declare internal packages with a deliberate workspace range such as `workspace:*`, and reserve root dependencies for tooling owned and run by the root package.
