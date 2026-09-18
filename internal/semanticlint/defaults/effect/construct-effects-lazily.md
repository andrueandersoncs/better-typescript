---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Construct Effects lazily

Creating an Effect must not start I-O, create a Promise, or perform expensive computation before the Effect runs. Start eager APIs inside the Effect adapter's lazy callback.

Do not report deliberately eager values whose work is trivial and side-effect free. Report only when constructing the changed Effect starts observable or expensive work before execution.
