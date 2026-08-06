# 16 — Render Semantic Module placement Advice

**Specification:** [Semantic Module inference](../spec.md)

**What to build:** Render complete, deterministic file-level Advice from silent placement Detections
so developers can see every mixed and split membership without receiving a move recommendation.

**Blocked by:** 15 — Emit exact Physical Module placement mismatches.

**Status:** ready-for-agent

- [ ] Mixed Advice emits once per mixed file, is titled `mixed Physical Module`, and lists every
      involved Semantic Module's complete membership, including entities in other files.
- [ ] Split Advice groups all split modules by canonical anchor file, is titled
      `split Semantic Modules`, and uses grammatical singular/plural remediation.
- [ ] Entity rows show display name, declaration kind, and `path:line:column`; evidence measures
      exactly match the specification.
- [ ] Advice preserves canonical module, member, path, and bond ordering; mixed precedes split at
      one file; overlap never suppresses either mismatch.
- [ ] Remediation states that grouping anchors are not destinations and gives no filename, path, or
      move direction.
- [ ] Structured tests assert exact title, location, remediation, evidence, rows, grouping,
      deduplication, and ordering.
- [ ] One composite Program runs through matcher, silent Signal, adviser, and normalized renderer;
      its exact report matches the representative contract and contains no raw placement block.
- [ ] Focused guidance/report tests and the full suite pass; formatting and self-hosting are clean;
      the benchmark remains below 100ms.
