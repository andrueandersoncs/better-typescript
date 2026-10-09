---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Preserve failure context

Report handling, mapping, or rethrowing that loses the original cause or relevant context, or does not explain what failed, such as `catch { throw new Error("failed") }` or `Effect.mapError(() => new Error("failed"))`. Do not report an error mapping or rethrow that retains the cause and relevant context and explains the failed operation.
