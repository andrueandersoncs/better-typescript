---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate stable behavior from required variation

Keep the common workflow in one place and isolate the parts that actually vary. Prefer small, composable collaborators when appropriate; do not build a flag-heavy configuration system or inheritance hierarchy just to accommodate a few differences.
