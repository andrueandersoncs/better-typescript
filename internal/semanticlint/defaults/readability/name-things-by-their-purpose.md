---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name things by their purpose

Use names that express purpose and domain meaning (e.g. `unpaid_invoices` rather than `data`, `calculate_total()` rather than `process()`). Avoid obscure abbreviations and redundant prefixes; short names are fine when obvious in context, such as `i` in a small loop. Avoid temporary variables that merely repeat an expression without clarifying it.
