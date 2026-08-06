# hot-subsystem

## Classification
Derived directory-level default advice outcome.

## Active wiring
`defaultDerive` runs `hotSubsystem` over all reported named detections; it is emitted after density advice and feeds `systemic-hotspots`.

## Implementation sources
`packages/guidance/src/hotSubsystem/hotSubsystem.ts`; `packages/guidance/src/hotSubsystem/data.ts`; `packages/guidance/src/preset/defaultDerive.ts`; `packages/core/src/engine/derive/derive.ts`.

## Intent
Identify a directory where findings concentrate enough to warrant one subsystem-level inversion.

## Detection boundary
Groups reported findings by file and every parent directory containing `/`. A directory qualifies with at least 25 findings, at least three files with findings, and at least 60% of all project findings. Emits only deepest qualifying directories. Evidence includes signals, files, integer percentage share, and per-policy counts.

## Exemptions and non-findings
Top-level single-segment directories are excluded; fewer than 25 findings, fewer than three files, or under 60% share is clean. A qualifying ancestor is suppressed when a qualifying descendant exists. Silent findings are excluded upstream.

## Guidance
Treat the directory as one subsystem: give it a Layer, hide shared state behind runtime primitives, and enter Effect at its edge.

## Dependencies
All reported named findings, file grouping, normalized parent directories, project total, and count summaries.

## Tests and examples
Deepest-directory unit coverage in `tests/advice.test.ts`; pair in `packages/guidance/examples/hot-subsystem/`; runner coverage in `tests/aggregateAdviceExamples.test.ts`.

## Skill migration
Proposed `lint-advice-hot-subsystem`; workspace-derived directory scope; requires the complete reported finding set and path hierarchy; hotspot fleet, post-rule aggregation phase; deterministic candidate generation can calculate thresholds/share/deepest selection exactly.

## Open questions
None identified.
