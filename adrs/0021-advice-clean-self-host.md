# ADR-0021: Advice-clean self-hosting

## Status

Accepted

## Date

2026-07-16

## Context

The self-hosting run treated Architecture Explore Advice as informational output: the repository
shipped with roughly 35 standing advice blocks while only reported style detections gated changes.
AGENTS.md now requires an empty report, so every adviser had to stop firing on this repository
without weakening any adviser.

Standing advice concentrated in five patterns:

- exported composition forwarders in engine modules whose real callers live in sibling packages,
  invisible to per-program caller counts;
- bidirectional imports between engine directories left over from the report-hub split;
- evidence collectors classifying test-ness by project-relative paths, so helpers in the repository
  tests project counted as production;
- `defaultWiring` enrolling 64 built-ins through 81 single-use imports; and
- public API exercised only by tests because the analysis horizon stopped at `packages/*` and
  `tests/`, hiding the repository's own production consumers (the self-host config, the benchmark,
  and the runnable examples).

## Decision

### Advice is a failing gate

`npm run dev` must end with an empty report. Advice blocks are fixed by following their remediation,
not by suppressing or rewording them.

### Engine modules own one direction

`runChecks`, `withProgramIndex`, and the fused-dispatch rows moved from sources to check; the
TypeScript watch producers moved from sources into watch; the workspace signal executor moved from
signal into wiring; report-block construction moved from derive into report; `namedDetection` moved
from location into derive. Every engine directory pair now imports in one direction.

### Test classification is workspace-relative

Evidence collectors classify files against the workspace root, so the repository tests project is
test-scoped even though its project root is the tests directory itself.

### The horizon includes the repository's production artifacts

The root `tsconfig.json` references the self-host config project, `bench/`, and the runnable
`examples/` projects. Public API that the repository genuinely consumes in production is therefore
visible to test-past-interface instead of looking test-only. API documented for consumers but unused
inside packages is exercised by a runnable example rather than deleted: the paradigm fleets and
policy classifiers in `examples/architecture-fleets/`, `withFallbackAdvice` and the precomposed
functional-core wiring in `examples/extend-preset/`, and `loadProject`/`runCheckOnProject` in
`examples/programmatic/main.ts`.

### Test-only exports are internalized

`decodeWiringConfig` moved to its own module that `loadWiringConfig` imports, so tests and
production cross the same seam. `locateNode` and `fileSubscription` became module-private; tests
build detections through `detection` and checks through `fileCheck`.

### Registration stays explicit but partitioned

`defaultChecks` is assembled from seven contiguous category modules of at most 13 check imports
each, preserving ADR-0018's reviewed direct list and the pinned report order while no single module
carries a registration ceremony.

## Consequences

- The self-hosting report is empty; regressions in any adviser now fail the gate immediately.
- The duplicated two-stream join lives once in `checks/support/advice.ts` with two callers.
- The bench entrypoint is `bench/main.ts`, a composition-root basename, because it runs effects at
  module scope by design.
- Cross-package callers still do not count toward forwarder deletability; exported engine
  combinators keep multi-statement bodies so shape checks and shallowness evidence agree.
- New public API must arrive with an in-repo production consumer (config, bench, or a runnable
  example) or it will fail the gate as test-only surface.
- The comment scanner performs the parser's context-sensitive rescans: a template-context stack
  drives `reScanTemplateToken` at substitution-closing braces and expression-position slashes drive
  `reScanSlashToken`. This closes ADR-0016's known blind spot, so comments after template literals
  and regex literals now reach all three comment checks; the comment-check fixtures pin the
  behavior.
