---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Provide defaults only when safe

Report a default value when a legitimate caller can receive an unsafe result by omitting that argument. Examples: `deleteUser(id, { force: true })`, a default production endpoint, or defaulting an authorization mode to allow access. Do not report a required argument, or a default that is safe for every supported omission and does not conceal a consequential choice.
