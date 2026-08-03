# Prototype Physical Module mismatch Advice

Type: prototype Status: resolved Blocked by: 05

## Question

What concrete Detections and Advice make split Semantic Modules and mixed Physical Modules precise
and actionable—locations, scope, messages, evidence data, deduplication, and entity lists—without
choosing filenames or move directions? Link representative rendered output as the resolution asset.

## Answer

The matcher emits a silent `semantic-module-placement` Signal with two schema-tagged Detection
projections:

- `split-semantic-module`: exactly one per Semantic Module whose members occupy more than one
  Physical Module. Its location is the canonical first member's declaration anchor.
- `mixed-physical-module`: exactly one per Physical Module containing members of more than one
  Semantic Module. Its location is that file at `1:1`.

Each projection embeds only the relevant portable snapshot slice, never the Program snapshot:
complete sorted entity records for every included Semantic Module, their sorted Physical Module
paths, and the module's canonical explanation-forest bond records with replayable evidence. Modules
are ordered by first member key; members, paths, and bonds retain snapshot order. The first member is
a grouping and reporting anchor, not a serialized module id.

The split Detection message is `This Semantic Module spans multiple Physical Modules.` Its hint is
`Keep every listed Code Entity in one Physical Module; the reporting anchor does not imply a
destination or move direction.` The mixed Detection message is `This Physical Module contains Code
Entities from multiple Semantic Modules.` Its hint is `Separate the listed Semantic Modules without
splitting their complete membership; no destination or move direction is inferred.`

The Signal is silent because raw Detection rendering cannot show its typed data and would duplicate
the complete Advice. One Architecture Explore adviser produces:

- one file-level `mixed Physical Module` Advice per mixed file, listing every involved Semantic
  Module's complete membership, including members in other files; evidence counts
  `code-entities-here` and `semantic-modules`;
- one file-level `split Semantic Modules` Advice per canonical first-member file, aggregating every
  split Semantic Module anchored there; evidence counts `code-entities`, distinct
  `physical-modules`, and `split-semantic-modules`.

Advice entity rows render display name, declaration kind, and `path:line:column`. Complete EntityKeys
and bond evidence remain in Detection data for audit and machine consumers. Advice modules, members,
and paths use the same canonical ordering as the projections. The matcher coalesces exact candidate
duplicates before emission; the adviser groups split projections by anchor path. A split and mixed
mismatch are independent and both render when they overlap. No aggregate suppresses another
mismatch.
Advice blocks sort by file path; at the same path, `mixed Physical Module` precedes
`split Semantic Modules`, matching the representative output.

Representative output: [Physical Module mismatch Advice prototype](../assets/07-recommended-rendered-output.md).
