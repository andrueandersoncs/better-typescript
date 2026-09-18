---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Adapt Promises once at integration boundaries

Wrap each Promise-based SDK in one dedicated adapter. Start the SDK call inside `Effect.tryPromise`, map expected rejection to a specific failure, and preserve the original cause.

Workflows must consume the adapter's Effect instead of repeatedly converting between Promises and Effects. Report only when changed code starts the Promise before adaptation, loses expected failure information, or performs repeated Effect-to-Promise round trips away from an integration boundary.
