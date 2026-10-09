---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use whitespace to separate logical steps

Apply this policy to function bodies with several statements. Keep the statements of one small task together (a guard with the value it checks, an accumulator with the loop that fills it), then put one blank line before the next task:

```ts
const input = parse(body)
if (!input.ok) return fail(input.error)

const record = await store.save(input.value)
return created(record.id)
```

Report any of these shapes:

- the closing `}` of a guard block that returns or throws, followed directly by a statement starting the next step, such as `if (!found) { return notFound() }` then `const next = await load(id)` on the next line;
- a body where validating, loading, writing, and responding run as one unbroken run of statements;
- a blank line that splits one task, such as between `const groups = new Map()` and the loop that fills it, or blank lines between every statement of a short loop or callback body;
- two or more consecutive blank lines.

Do not report a compact group that accomplishes one small task, including consecutive statements where each feeds the next, or one blank line after a group of dependency lookups.
