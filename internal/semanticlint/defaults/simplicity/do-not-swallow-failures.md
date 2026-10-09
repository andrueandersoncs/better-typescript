---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not swallow failures

Report handling that silently discards a failure or turns it into a success-shaped default without clear intent, such as `try { ... } catch { return [] }` or `Effect.catchAll(() => Effect.succeed([]))`. Do not report explicit, intentional recovery whose returned default and purpose are clear.
