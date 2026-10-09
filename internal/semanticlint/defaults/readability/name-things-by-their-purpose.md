---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Name things by their purpose

Apply this policy to names of local variables, constants, parameters, fields, and types. Each name should say what role the value plays here, such as `const overdueTasks = tasks.filter(isOverdue)`, and must not claim something the value is not. Report any of these shapes:

- a name that states only a generic kind or container while the value has a specific role, such as `data`, `result`, `list`, `items`, `arr`, `obj`, `value`, or `info`, as in `const list = users.filter(isActive)` or `const data: SignupForm = { ... }` passed on to an operation;
- a name that misdescribes its value, claiming a property, order, unit, or kind the code does not give it, such as `const sortedUsers = users.filter(isAdmin)` (filtered, never sorted) or `const expiredTokens = tokens.filter(isRevoked)`;
- a type alias or interface named only by shape, such as `type Info = { userId: string }`.

A filtered, sorted, or narrowed collection with a generic or misleading name is reportable even when it is used only a few lines later.

Do not report function or method names; `function-naming` covers them. Do not report short names whose meaning is obvious in context, such as `i` in a small loop, `a`/`b` in a comparator, or a one-letter lambda parameter.
