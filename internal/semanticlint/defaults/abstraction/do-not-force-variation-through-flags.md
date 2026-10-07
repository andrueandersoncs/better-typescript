---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not force variation through flags

Do not force code that varies, or is likely to evolve differently, through one path controlled by optional parameters, boolean flags, special cases, confusing parameters, flag-heavy configuration systems, or inheritance hierarchies built to accommodate a few differences. An operation should not become several operations selected by flags.
