# 01 — Decide disposition of disabled self-host checks

**Status:** needs-triage

## What happened

Self-hosting runs reported Checks plus the separately wired `semantic-module-placement` policy and
its Advice. Other silent evidence, Architecture Explore policies, and Advice derivation are absent,
so their findings cannot gate this repository. A clean report therefore does not prove the
documented full dogfooding and Advice-clean contract.

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

## Additional context

Choose one disposition per Check:

- Delete its matcher, guidance, tests, examples, and catalog entry.
- Debug its relevance, false positives, or cost, then restore it to self-hosting.

Keep a Check only when it can participate in the repository's empty self-host report and benchmark
gate.

## Comments

### 2026-08-09 — `semantic-module-placement` restored

Disposition: repaired and restored. The Check produced false negatives because
`exclusive-consumer-ownership` merged across proven subject boundaries and no rule expressed subject
ownership. Both were fixed (see `.scratch/signal-organization-self-hosting/bug-research.md`), the
seven resulting repository findings were remediated by relocation, and the Check now runs in
self-hosting through `selfHostPlacementWiring.ts` with an empty report and a 69.1ms benchmark. The
remaining seventeen Checks in the list above are still undispositioned.

### 2026-08-13 — Status normalized

The canonical status remains `needs-triage`: `semantic-module-placement` is restored, but the listed
seventeen Checks still lack delete-or-restore decisions and remain excluded from reporting-only
self-hosting. `bun test tests/selfHostBenchmark.test.ts` passed 3 tests, and `bun run dev` was
empty.
