---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep comments current

Report a comment that describes behavior the code no longer performs, such as `// Retries three times` above `Effect.retry(task, { times: 1 })`, or a comment left unchanged after its described behavior changes. Do not report a comment that remains accurate, even when it describes simple code.
