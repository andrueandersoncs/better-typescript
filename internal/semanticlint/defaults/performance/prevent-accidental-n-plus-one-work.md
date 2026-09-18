---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Prevent accidental N-plus-one external work

Do not perform one database, HTTP, filesystem, process, or service operation for every item of a variable-size input when the operation's contract supports batching or shared retrieval. Include unchanged helpers reached from the changed iteration when identifying the external work.

Do not report explicitly bounded small inputs or unavoidable per-item operations. Report only when the changed execution path makes external work grow per item and available repository evidence shows that work can be batched or reused.
