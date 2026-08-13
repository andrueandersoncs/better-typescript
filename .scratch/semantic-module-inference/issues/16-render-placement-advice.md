# 16 — Render Semantic Module placement Advice

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Render complete, deterministic file-level Advice from silent placement Detections
so developers can see every mixed and split membership without receiving a move recommendation.

**Blocked by:** 15 — Emit exact Physical Module placement mismatches.

**Status:** done

- [x] Mixed Advice emits once per mixed file, is titled `mixed Physical Module`, and lists every
      involved Semantic Module's complete membership, including entities in other files.
- [x] Split Advice groups all split modules by canonical anchor file, is titled
      `split Semantic Modules`, and uses grammatical singular/plural remediation.
- [x] Entity rows show display name, declaration kind, and `path:line:column`; evidence measures
      exactly match the specification.
- [x] Advice preserves canonical module, member, path, and bond ordering; mixed precedes split at
      one file; overlap never suppresses either mismatch.
- [x] Remediation states that grouping anchors are not destinations and gives no filename, path, or
      move direction.
- [x] Structured tests assert exact title, location, remediation, evidence, rows, grouping,
      deduplication, and ordering.
- [x] One composite Program runs through matcher, silent Signal, adviser, and normalized renderer;
      its exact report matches the representative contract and contains no raw placement block.
- [x] Focused guidance/report tests and the full suite pass; formatting and self-hosting are clean;
      the benchmark remains below 100ms.

## Comments

### 2026-08-13 — Verified complete

The current snapshot, placement matcher, and Advice implementation satisfy every acceptance item.
Verification passed: 38 focused Semantic Module tests, 691 full-suite tests, an empty `bun run dev`
report, and a 66.079ms benchmark.
