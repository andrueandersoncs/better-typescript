---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Declare variables near their first use

Apply this policy to local variables in function and generator bodies.

Declare each variable just before the statement that first reads it, in the smallest block that uses it, and prefer one `const` over a default that is overwritten later:

```ts
const parsed = parse(text)
if (!parsed.ok) throw parsed.error
const mode = options.mode ?? DEFAULT_MODE
return build(parsed.value, mode)
```

Report any of these shapes:

- a `let` initialized with a default at the top of a function and next touched only after unrelated loads, checks, or early returns, such as `let mode = DEFAULT_MODE` followed much later by `if (override) mode = override`;
- a `const` computed at the top, such as a timestamp, deadline, or derived value, first read only near the end after unrelated loads and guard clauses that may return early;
- `let result;` followed by unrelated statements before `result = compute(input)`;
- a variable declared before an `if` or loop when it is used only inside that block.

Do not report variables used by several later steps (such as dependencies obtained at the top), a broader scope required by later uses, or a declaration separated from its use only by statements that compute its inputs.
