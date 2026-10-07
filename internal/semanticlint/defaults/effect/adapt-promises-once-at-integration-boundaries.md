---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Adapt Promises once at integration boundaries

Wrap each Promise-based SDK in one dedicated adapter, and let workflows consume the adapter's Effect instead of repeatedly converting between Promises and Effects. Run Effects only at executable and test boundaries.

Report only when this file performs repeated Effect-to-Promise round trips, or runs an Effect, away from an integration, executable, or test boundary.
