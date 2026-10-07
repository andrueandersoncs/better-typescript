---
globs:
  - "**/*.{ts,tsx}"
---
# Isolate unsafe type escapes

Do not use unexplained `any`, non-null assertions, or double casts. When unsafe interop is unavoidable, isolate it behind the smallest named boundary and test that boundary's behavior.
