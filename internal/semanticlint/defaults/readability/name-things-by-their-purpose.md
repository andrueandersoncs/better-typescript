---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name things by their purpose

Report a variable, parameter, field, or type name that states only a kind or shape when the code gives it a specific domain role, or that says the value holds something it does not. Examples include `const data = unpaidInvoices`, `const result = rejectedOrder`, and `type Info = { invoiceId: string }`. Prefer a purpose-based name such as `unpaidInvoices`. Do not report function names; `function-naming` covers them. Do not report short names whose meaning is obvious in context, such as `i` in a small loop.
