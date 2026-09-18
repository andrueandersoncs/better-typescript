---
globs:
  - "**/*.{ts,tsx}"
---
# Separate storage, domain, and API representations

Use distinct database row, domain object, and API payload models whenever their semantics differ, and map between them explicitly at the receiving boundary. Preserve meaningful identifiers, timestamps, units, and validated distinctions until that boundary requires another representation. Expose only selected API fields, and test transformations of dates and identifiers. When the representations are truly identical, reuse one model instead of creating duplicates.
