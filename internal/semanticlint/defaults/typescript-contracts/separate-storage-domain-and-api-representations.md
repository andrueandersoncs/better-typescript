---
globs:
  - "**/*.{ts,tsx}"
---
# Separate storage, domain, and API representations

Use distinct database row, domain object, and API payload models whenever their semantics differ, and map between them explicitly at the receiving boundary. When the representations are truly identical, reuse one model instead of creating duplicates.
