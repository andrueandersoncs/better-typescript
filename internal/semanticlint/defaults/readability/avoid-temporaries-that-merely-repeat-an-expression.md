---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid temporaries that merely repeat an expression

Apply this policy to local `const` and `let` bindings in executable code; commented-out code cannot violate it. Check every binding on its own: one redundant temporary is enough to report the file, even when its neighbors are well named.

Report a temporary used once whose name tells the reader nothing beyond the expression it holds:

- a rename of a plain property access, where the name just joins the path's segments, such as `const ownerEmail = account.owner.email` or `const userName = user.name`, used once in a call, template literal, or `return`; inlining `account.owner.email` reads the same;
- a generic placeholder name, such as `data`, `result`, `value`, `temp`, `res`, `items`, or `list`, for a computed value, such as `const data = rows.filter(isOpen).map(toId)` used only as `unique(data)` or as one loop's source. The name does not say what the expression yields.

Do not report:

- a temporary whose name states a non-obvious calculation, representation, or domain role, such as `const openIds = rows.filter(isOpen).map(toId)` or `const discountedCents = applyDiscount(subtotal, discount)`, even when used once;
- a temporary used more than once or captured for narrowing, such as `const label = entry?.label` checked and then returned;
- a binding that obtains a service or awaits a result, such as `const db = yield* Database`;
- loop element bindings and accumulators.
