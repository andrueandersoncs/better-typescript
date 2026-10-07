---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name things by their purpose

Name variables, parameters, fields, and types for their purpose and domain meaning. Report a name that states only a kind or shape, such as `data`, `info`, `item`, `result`, `value`, `obj`, `list`, or `temp`, when the code gives the value a specific domain role, and a name that misstates what the value holds. For example, prefer `unpaid_invoices` to `data`. Short names are fine when obvious in context, such as `i` in a small loop.

Do not report function names; `function-naming` covers them.
