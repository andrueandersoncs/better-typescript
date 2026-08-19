# ADR-0031: Source-scoped scanner execution

## Status

Accepted.

## Context

Core invokes each Rule for one configured source file. Scanner Rules instead planned and traversed
the whole Program on every invocation, then discarded findings from other files. Rule-local caches
hid the repeated work while scanning disabled files and retaining the latest compiler graph.

Program-wide semantic indexes remain necessary for checks that compare declarations across files.
They must not turn finding execution back into a Program-wide operation or keep a completed analysis
alive.

## Decision

A scanner plan may inspect all project sources to build semantic facts, but subscription execution
visits only `RuleContext.sourceFile`. File and node handlers therefore share the same source-file
scope as every other Rule, and disabled files are not scanned.

Program-indexed plans use named latest-identity owners. An owner keeps weak references to its latest
identity and value because the analysis run owns compiler lifetime. Repeated uses may reuse the
current index, a new Program replaces the logical latest entry, and cache state cannot retain a
completed Program. Checker- and symbol-indexed helpers follow the same ownership rule.

Scanner constructors expose only planning behavior; unsupported compiler-option metadata and
whole-Program match caches are removed.

## Consequences

- Configuration controls both reporting and scanner execution.
- Program-wide indexes can inform one source file without producing findings for other files.
- Alternating Programs cannot reuse another Program's semantic facts.
- Completed compiler graphs remain reclaimable even while the built-in Rule catalog stays alive.
- Source traversal is repeated per active Rule rather than fused across Rules; the whole-process
  benchmark remains the performance gate.
