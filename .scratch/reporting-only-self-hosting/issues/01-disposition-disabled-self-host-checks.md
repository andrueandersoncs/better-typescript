# 01 — Decide disposition of disabled self-host checks

**Status:** needs-triage

## What happened

Self-hosting now runs only reported Checks over package production sources. Silent evidence,
Architecture Explore, and all Advice derivation are absent, so their findings cannot gate this
repository. A clean report now proves only the reported-policy subset, not the documented full
dogfooding and Advice-clean contract.

## What I expected

Decide whether each disabled Check should be deleted as unsupported or repaired and restored to
self-hosting.

## Steps to reproduce

1. Run the normal self-host configuration.
2. Inspect its emitted report for a case detected only by a disabled Check or its Advice.
3. Observe that the self-host report stays unchanged.
4. Enable the corresponding explicit fleet and observe that its Signal or Advice becomes eligible.

## Disabled Checks

- `prefer-curried-data-last-functions`
- `effect-quality-advice-evidence`
- `functional-core-effect-shape-evidence`
- `pass-through-wrappers`
- `interface-burden`
- `module-graph`
- `test-only-exports`
- `seam-leakage-evidence`
- `import-usage`
- `module-identity`
- `export-surface`
- `external-dependency-construction`
- `single-adapter-seams`
- `composition-forwarders`
- `module-scope-effects`
- `context-tag-seams`
- `composition-fingerprints`
- `semantic-module-placement`

## Additional context

Choose one disposition per Check:

- Delete its matcher, guidance, tests, examples, and catalog entry.
- Debug its relevance, false positives, or cost, then restore it to self-hosting.

Keep a Check only when it can participate in the repository's empty self-host report and benchmark
gate.

## Comments
