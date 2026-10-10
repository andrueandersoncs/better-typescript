---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Use whitespace to separate logical steps

Apply this policy to function bodies with several statements. Deterministic rules already require a blank line between statements of different kinds and around multi-line statements, and forbid blank lines between same-kind single-line declarations. Judge only what they cannot: where one task ends and the next begins inside a run of single-line expression statements (calls and assignments).

```ts
validate(input)
audit.record(input.id)

cache.invalidate(input.id)
events.publish(updated(input.id))
```

Report any of these shapes:

- a run of expression statements that mixes separate tasks, such as validating, writing, and notifying, with no blank line between tasks;
- a blank line that splits one task inside a run of same-kind expression statements, such as blank lines between every call in a short loop or callback body;
- two or more consecutive blank lines.

Do not report a blank line, or its absence, that the deterministic blank-line rules decide: a boundary between different statement kinds, a boundary next to a multi-line statement, or a gap between same-kind single-line declarations. Do not report a compact group that accomplishes one small task, including consecutive statements where each feeds the next.
