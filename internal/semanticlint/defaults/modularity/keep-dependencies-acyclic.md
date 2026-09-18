---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep dependencies acyclic

A module must not depend on itself indirectly: `A → B → C → A`. Resolve cycles by moving responsibilities, extracting a genuinely shared concept, or introducing an appropriate interface—not by hiding the cycle behind dynamic imports.
