---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid temporaries that merely repeat an expression

Apply this policy to local `const` and `let` bindings in executable code; commented-out code cannot violate it.

Report a temporary used once whose name tells the reader nothing beyond the expression it holds:

- a rename of an already-obvious expression, such as `const userName = user.name;` used only as `send(userName)`;
- a generic placeholder name, such as `data`, `result`, `value`, `temp`, `res`, `items`, or `list`, for a computed value, such as `const data = rows.filter(isOpen).map(toId)` used only as `unique(data)`. The name does not say what the expression yields, so it merely repeats it.

Do not report:

- a temporary whose name states a non-obvious calculation, representation, or domain role, such as `const openIds = rows.filter(isOpen).map(toId)` or `const discountedCents = applyDiscount(subtotal, discount)`, even when used once;
- a temporary used more than once or captured for narrowing, such as `const label = entry?.label` checked and then returned;
- loop element bindings and accumulators.
