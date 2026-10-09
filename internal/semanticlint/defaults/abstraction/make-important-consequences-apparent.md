---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make important consequences apparent

Report an operation that presents itself as harmless local work while it hides a database write, network request, file operation, expensive or destructive action, partial result, or consistency limitation. Examples: `calculateTotal()` that calls `saveOrder()`, or `getReport()` that silently sends an email. Do not report an effect whose consequential operation is apparent from its public name, result, or API, such as `saveReport()`, `deleteUser()`, or an explicitly returned `Effect`.
