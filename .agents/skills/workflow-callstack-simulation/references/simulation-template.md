# Callstack Template

Output only the following callstack structure with its placeholders replaced. Do not include the
surrounding code fence.

```markdown
**Entry Point**(arguments) │ ├─ **First Callee**(arguments) │ │ │ ├─ if (first pattern):
<first case> │ │ │ ├─ else if (second pattern): <second case> │ │ │ └─ else: <fallback case> │ └─
**Second Callee**(arguments) │ └─ **Nested Callee**(arguments) │ └─ if (failure condition): throws
<error>
```

## Rendering rules

- In compact detail, represent a frame as `**Operation Name**(arguments)`. Convert every operation
  name to bold Capital Case: capitalize each word and separate words with spaces, never hyphens.
  Indentation shows caller/callee nesting; sibling order shows execution order. Distinguish repeated
  calls by arguments or call path. Do not add numeric frame IDs, routine return values, outcome
  annotations, or routine enter, exit, step, resume, unchanged-state, and source-marker text.
- Do not enclose the complete caller string in backticks or retain placeholder angle brackets around
  operation names or arguments.
- Put exactly one spacer line between all rendered callstack lines, including notes and conditional
  clauses. On that spacer, place `│` at each indentation column whose call branch continues below
  and spaces where it has ended.
- Beneath a frame, include at most one short note or conditional block, limited to a material
  condition, state change, intended side effect, blocker, truncation, or error.
- Write conditional clauses in source order on separate lines as `if (<pattern>): <case>`,
  `else if (<pattern>): <case>`, and `else: <case>`, omitting nonexistent clauses. Move a long or
  nested case to the next indented line. Never use a `branch:` label or arrow- or comma-separated
  pattern mappings.
- Show alternative continuations inline only when unresolved conditions materially change the
  result.
- Represent spawned concurrent work as a separate operation-named root; include a join only when the
  target guarantees one.
- Expanded detail may additionally include concise entry values and ordered `enter`, `step`, or
  `state` notes; all other rules still apply.
- Output the callstack directly with no title, section heading, scenario, status, execution, limits,
  assumptions, ambiguities, uncertainties, symbolic-value reference markers, wrapper, or completion
  metadata. Represent material blockers and truncation only as notes within the relevant frame.
