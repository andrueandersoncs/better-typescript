# Define Semantic Module partition barriers

Type: grilling Status: resolved

## Question

Beyond the settled production/test split, which strata must never share a Semantic Module—such as
project or package boundaries, external or ambient declarations, generated sources, scripts, and
composition roots—and how do barriers take precedence over candidate bonds?

## Answer

A Partition Barrier is an absolute prohibition against joining two otherwise eligible Code Entities.
Source eligibility is decided before barriers:

- Analyze each TypeScript Program independently.
- A source participates only when it matches the current Wiring entry's workspace-relative `files`
  globs and passes the existing first-party source predicate. Unmatched sources produce no Code
  Entities and cannot mediate bonds.
- Use that existing Wiring scope to exclude generated sources and scripts explicitly. Do not infer
  either role from names, paths, comments, syntax, or package metadata. A matched generated or
  script source is therefore treated normally.
- Exclude ambient declarations, including declaration-file contents, `declare` forms, ambient
  modules, global augmentations, and declarations from dependencies. Retain `ambient-declaration` as
  the typed normalization-exclusion reason.

The only within-Program stratum barrier is production versus test:

- Reuse the existing test classifier: `test/`, `tests/`, `__tests__/`, `*.test.ts[x]`,
  `*.spec.ts[x]`, and `bench/` are test-like; every other eligible source is production.
- npm package ownership is not a barrier.
- Script, generated-source, and composition-root roles are not strata.

Assign eligibility and the production/test stratum before evaluating candidate bonds. Reject every
bond whose endpoints are not both eligible members of the same Program and stratum before
fixed-point closure. Retain each rejected candidate as ordered suppressed-bond evidence; it never
merges entities or mediates a transitive merge.
