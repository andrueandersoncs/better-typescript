---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid obscure abbreviations and redundant prefixes

Report a name that uses an abbreviation its context does not make clear, such as `usr` or `cfg`, or repeats information already supplied by its scope or type, such as `order_order_id`. Do not report short or familiar names whose meaning is obvious where used, such as `i` in a small loop.
