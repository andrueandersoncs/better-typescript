---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Give frontend state one owner

Distinguish server data, URL state, local interaction state, and long-running client workflows. Give each value one authoritative owner; never duplicate authority across a query cache, component state, and Effect stores. Do not force ordinary UI state into Effect.
