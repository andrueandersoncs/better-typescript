---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name booleans as conditions

Report a boolean whose name does not state the condition it represents, such as `valid`, `permission`, or `status` for a `boolean`; use names such as `is_valid` or `has_permission`. Do not report a boolean name that clearly states its condition.
