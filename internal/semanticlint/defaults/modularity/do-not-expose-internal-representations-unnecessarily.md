---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not expose internal representations unnecessarily

Report an interface that returns a storage-specific record or fields the caller does not need instead of data appropriate to its task, such as returning `UserRow` when the caller only needs `UserSummary`. Do not report a storage-shaped return when that representation and every exposed field are appropriate to the caller’s task.
