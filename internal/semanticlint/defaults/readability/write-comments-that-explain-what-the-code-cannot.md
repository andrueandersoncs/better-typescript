---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Write comments that explain what the code cannot

Report code with an undocumented intent, constraint, assumption, or non-obvious tradeoff that cannot be expressed by the code itself. For example, `if (attempts > 3) return` needs an explanation when `3` is a business limit, and a deliberately slower query needs a comment when it preserves an important guarantee. Do not report code whose purpose and constraints are already clear from its names and control flow.
