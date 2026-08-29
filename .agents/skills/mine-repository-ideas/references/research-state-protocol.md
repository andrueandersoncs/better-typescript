# Research State Protocol

This file is the single authority for repository-mining identity, annotations, fingerprints, incremental reads, ledger state, and report serialization.

## Candidate identity

- An existing stable ID or alias always wins. Never renumber it.
- Store one candidate namespace in each report. Preserve the legacy namespace `E`. For a new report, use `S` followed by the first 8 uppercase hexadecimal characters of `SHA-256(canonical URL)`.
- A candidate kind is `RULE` or `IDEA`. Its key is a unique lowercase kebab-case semantic policy or idea key. Match an existing key or alias before creating a candidate.
- After adjudication, group unmatched new keys by kind, sort each group by UTF-8 key bytes, and assign consecutive three-digit ordinals after that kind's current maximum. Form IDs as `<namespace>-<kind>-<ordinal>`. Record prior or alternate keys as aliases in decision/history evidence. Allocation is deterministic and never renumbers old IDs.

## Human annotations

- Recognize an annotation only as exactly one standalone line matching `^\[(ACCEPT|DENY):\s*(.+)\]$` directly beneath and associated with a candidate heading. Preserve its current raw line byte-for-byte.
- Multiple, conflicting, or unassociated annotation lines block work with exactly one question.
- `ACCEPT` sets `accepted`. `DENY` sets `denied`. A human verdict outranks a machine disposition.
- Editing only the note or raw bytes while keeping the same verdict updates only the stored note and annotation hash. It never reopens, re-adjudicates, or scans the candidate.
- A verdict change, annotation addition, or annotation removal affects only that candidate and causes bounded re-adjudication. Read source only when its recorded evidence is stale or explicit focus requests it.
- Suppress `DENY` candidates. Do not repropose `ACCEPT` candidates. Keep prior annotation decisions and history cumulatively, but never silently recreate an annotation line that a human removed.

## Fingerprints and state encoding

All hashes are SHA-256 and lowercase hexadecimal unless a field says otherwise.

- Source identity is the canonical URL, exact 40-hex commit SHA, and commit tree ID.
- The Better TypeScript fingerprint covers regular files in `internal/rules/**`, `internal/rules/catalog.go`, `docs/rules.md`, `docs/rules/**`, and `skills/better-typescript/SKILL.md`. Deduplicate paths and sort by UTF-8 repo-relative path bytes. Encode each record as UTF-8 repo-relative path, NUL, ASCII decimal byte length, NUL, raw file bytes. Concatenate records with no separator beyond those fields, then hash the bytes.
- The method fingerprint uses the same record encoding and UTF-8 path-byte sort for this protocol and its skill. Paths are always relative to the `mine-repository-ideas` skill root, exactly `SKILL.md` and `references/research-state-protocol.md`.
- The scope signature is canonical minified UTF-8 JSON with keys in this exact order: `focus`, `exclusions`, `depth`, `context`, `gaps`. Normalize line endings to LF. Normalize absent `focus`, `exclusions`, `context`, and `gaps` to `[]`. Default absent `depth` to `"default"`. Sort set-like arrays by UTF-8 bytes. Preserve scalar context values exactly after line-ending normalization.
- For the annotation hash, sort candidates by stable ID UTF-8 bytes. For each currently annotated candidate, append ID, NUL, its current raw annotation line, and LF. Hash the concatenation. With no annotations, hash the empty byte string.
- The state key is the hash of these UTF-8 fields in exact order: canonical URL, commit SHA, tree ID, Better TypeScript fingerprint, method fingerprint, scope signature, annotation hash. Separate fields with one NUL and add no trailing NUL.

## Bootstrap profile

This profile is authoritative for a missing or legacy report. Paths are repository-relative POSIX paths and matching is case-sensitive. `**` matches zero or more complete path segments. A path belongs to a lane when it matches any include glob and no exclude glob; it may belong to multiple lanes. Every lane uses these excludes: `.git/**`, `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/coverage/**`, `**/.cache/**`, `**/.turbo/**`, `**/*.min.js`, `**/*.map`.

Seed these lanes in UTF-8 lane-ID order. Store every include and exclude glob only in `Research ledger > Coverage lanes`; future runs use only that authoritative table. Keep `Coverage and limits` as a concise human summary that points to the ledger instead of duplicating it.

| Lane | Kind | Include globs |
|---|---|---|
| `docs-ci` | `other` | `.github/**`; `docs/**`; `**/*.md`; `**/test/**`; `**/tests/**`; `**/__tests__/**`; `**/*test*.ts`; `**/*spec*.ts`; `**/*config*.ts`; `**/*config*.js`; `**/*config*.mjs`; `**/*config*.cjs`; `**/*config*.json` |
| `perf-size-ci` | `other` | `.github/**`; `scripts/**`; `package.json`; `**/package.json`; `**/*bench*`; `**/*perf*`; `**/*size*` |
| `release-distribution` | `other` | `.github/**`; `.changeset/**`; `changesets/**`; `scripts/**`; `npm/**`; `package.json`; `**/package.json`; `**/*release*`; `**/*publish*`; `**/*pack*` |
| `rules` | `lint` | `**/*.ts`; `**/*.tsx`; `**/*.mts`; `**/*.cts` |

A missing report bootstraps as follows:

1. Resolve the current canonical URL, exact SHA, and tree. Compute the current Better TypeScript and method fingerprints from their manifests, the current normalized scope signature from the request and defaults, and the empty annotation hash. These are the current seven state fields.
2. Derive the namespace and seed the four lanes above with `not-run`, no covered evidence, the current source SHA, and no gap IDs. Start the candidate register and candidate re-adjudication set empty. There is no prior state key or state history.
3. Plan `full-scan` for all four lanes. This full-all mode dominates every later trigger in the run. A newly declared method lane is an open gap and is not added to the scan.

A legacy report is an existing report that predates and does not claim this protocol's current ledger format. A malformed current-format report is a validation error, not legacy. Before applying transition rows, bootstrap a legacy report as follows:

1. Parse candidates, evidence, coverage, and annotations first. Reuse every existing ID or alias. Deterministically allocate an ID only for a Candidate identity without one. Apply annotation verdicts. Migration itself leaves the candidate re-adjudication set empty.
2. Recover the historical canonical URL from, in order: one explicit Source canonical URL; one unique canonical repository base shared by all pinned links; or the resolved current canonical URL, marked `recovered-current` and not comparable as history. Recover the historical SHA from one explicit exact Source SHA, else one unique 40-hex SHA shared by pinned blob links, else `unknown`. For a known recovered SHA, recover its tree with Git or forge metadata; if unavailable, use `unknown`.
3. Accept a historical Better TypeScript, method, or annotation fingerprint only when its declared encoding matches this protocol and every recomputation input and manifest exists; otherwise use `unknown`. Never substitute a current Better TypeScript or method fingerprint for a historical value. Regardless of a legacy annotation fingerprint, recompute the current annotation hash from the associated raw annotation lines. Normalize historical scope from explicit legacy fields. For each absent scope field use the protocol default and mark that field `defaulted`; the resulting historical scope is comparable only for its explicit fields.
4. Seed the exact four lanes above. Map an explicit legacy inspected path or glob to every lane whose stored globs it matches. Map a coverage-prose claim only when it explicitly names a lane ID or a literal path or glob; apply the same matching rule. Retain only claims and evidence present in the legacy report. Set a lane to `complete-targeted` only when the report evidences its bounded inspected scope, `partial` when it contains only some matching evidence or claims, and `not-run` otherwise. Set its `Source SHA` to the known recovered historical SHA for that evidence, else `unknown`, and attach applicable gap IDs. Put every unmapped claim in the stable `legacy-unmapped` gap. Do not infer complete coverage from prose.
5. Use stable bounded gap IDs. Use `legacy-unknown-<field>` for an unavailable historical `canonical-url`, `sha`, `tree`, `better-typescript-fingerprint`, `method-fingerprint`, or `annotation-fingerprint`; `recovered-current` canonical URL counts as unavailable history. Use `legacy-unknown-scope-<field>` for an explicit but unusable scope field. Use `legacy-defaulted-scope-<field>` for an absent scope field, without also adding an unknown-scope gap. Each gap records the missing historical value and the evidence needed to close it. Unknown metadata, defaulting, and migration alone cause no source read or re-adjudication.
6. Compute all seven current fields normally from the resolved current source, current inventories and manifests, normalized current scope, and current raw annotations. Compute and append the new current state after the migrated historical state; use sentinels only in historical state and gaps, never in the current state.

After legacy bootstrap, apply ordered triggers only to comparable recovered historical fields. A different comparable canonical URL triggers new-canonical full-all. When canonical URL is comparable and unchanged, known SHA and tree differences use the descendant/non-descendant rule; an unknown prior SHA or tree is not a difference. A verifiable Better TypeScript difference triggers only its overlap re-adjudication; an unknown prior fingerprint does not. The exact migration-run re-adjudication set is the UTF-8-sorted union of only: IDs added by current explicit focus; IDs with an annotation verdict addition, change, or removal; IDs whose recorded overlap paths intersect a verifiable Better TypeScript manifest diff; and IDs with stale evidence from a comparable source delta. Migration and unknown fields add no IDs. Read bounds come only from the resulting ordered transition rows and stored lane globs.

## Incremental reads

Before planning work, parse and validate every available report, ledger, resolved source identity, and annotation. Classify an absent ledger as missing or legacy before applying current-ledger validation. An ambiguous or conflicting annotation, a malformed or duplicate current-form state, the same known SHA paired with a different known tree, or a current-form state key that does not match its stored fields blocks with exactly one question or error and no scans.

The state fields are exactly: canonical URL, SHA, tree, Better TypeScript fingerprint, method fingerprint, scope signature, and annotation hash. Classify all comparable differences before planning. Apply this table in order. Compose every nonblocking row unless a higher row makes its lane read mode dominant.

| Order | Trigger | Lane read mode | Other transition |
|---:|---|---|---|
| 0 | Input validation | `no-source-scan` while validating. A blocking error stops all transitions and scans. | Validate before bootstrap or difference classification. |
| 1 | Report is missing | Invoke the missing-report Bootstrap profile. `full-scan` all four seeded lanes; this full-all mode cannot be downgraded by any later row. | Create the initial ledger with no prior state key or history. Candidate and re-adjudication sets start empty. |
| 2 | Report is legacy | Invoke the legacy-report Bootstrap profile first. Migration alone is `no-source-scan` every lane. Then apply later rows only for comparable recovered fields. | Migrate and normalize the ledger. Migration alone re-adjudicates no candidate. |
| 3 | Comparable canonical URL changed | `full-scan` every stored lane. This dominates every later source or scope read mode. | Treat it as a new source; still compose later non-read effects. |
| 4 | Comparable SHA or tree changed under the same comparable canonical URL | First use Git metadata to test ancestry. If the prior SHA is an ancestor of the current SHA, a lane is `delta` only for changed or new paths or hunks mapped to it by stored lane globs, plus its explicitly stale cited evidence; every other lane is `no-source-scan`. Use Git diff metadata and create a bounded `unmapped-path` gap for unmatched changed paths. Read none of those paths until selected. If ancestry or the base is unavailable, or the current SHA is not a descendant, `full-scan` every stored lane; this dominates every lower read mode. An unknown prior field is not a difference. | Re-adjudicate only IDs whose cited paths were deleted or whose evidence became stale. |
| 5 | Comparable scope signature differs, or current focus or a selected gap directs work | Removed exclusions, increased depth, selected gaps, or focus naming a lane or path make only the affected lanes `delta`, limited to that newly admitted explicit scope. New exclusions or reduced depth add no read. Candidate focus adds a delta only for explicitly requested refresh paths or evidence made stale by row 4. Context-only change adds a delta only for explicitly requested new source evidence. All other lanes are `no-source-scan` unless a higher row applies. Omitted or unchanged scope adds nothing. Defaulted legacy fields are not differences. | Candidate focus re-adjudicates only that ID. Context-only change re-adjudicates only affected IDs. |
| 6 | Comparable Better TypeScript fingerprint differs | By itself, `no-source-scan` every lane and read no external source contents. Compose any higher source reads. An unknown prior fingerprint is not a difference. | Diff the Better TypeScript manifest. Re-adjudicate only IDs whose recorded overlap paths intersect it. Put new or unmapped Better TypeScript paths in a bounded gap. |
| 7 | Comparable method fingerprint differs | By itself, `no-source-scan` every lane and read no external source contents. An unknown prior fingerprint is not a difference. | Migrate the ledger deterministically. Re-adjudicate no candidate for this trigger. A newly declared method lane or scope is an open gap, not an automatic scan. |
| 8 | Annotation hash differs | By itself, `no-source-scan` every lane. Source is permitted only when row 4 made that ID's evidence stale or explicit focus requests refresh. | Compare by ID and verdict. The same verdict with only note or raw-byte changes updates only annotation history and the hash. Verdict addition, change, or removal re-adjudicates only that ID. Conflicts were already blocked. |
| 9 | No comparable field differs and there is no focus or selected gap | `no-source-scan` every lane. | Byte-forward only when no bootstrap, migration, or real state change requires serialization. |

For simultaneous changes, evaluate all applicable rows in order. A full-all scan from a missing report, a new canonical URL, or a non-descendant or unavailable base dominates for every stored lane and cannot be downgraded. Otherwise, for each lane, union the path sets from source delta and scope delta: a nonempty set is `delta`; an empty set is `no-source-scan`. Union re-adjudication IDs from source deletions or stale evidence, scope or context, Better TypeScript overlap, and annotations. Deduplicate and sort reasons, paths, and IDs by UTF-8 bytes. Combination alone never broadens a bound.

Determine lane relevance exclusively from each Coverage lane's stored include and exclude globs under the Bootstrap profile's matching semantics. Invent no heuristic. A path that matches multiple lanes belongs to all of them. An unmatched changed path becomes a bounded gap.

Resolution may read Git or forge metadata. A full scan reads only its stored lane include globs minus excludes. A delta reads only its planned paths or hunks and explicitly stale evidence. A `no-source-scan` task reads zero external source contents. Initial and final reviews may read only external paths actually read by scans or explicitly selected revalidation paths. When every lane is no-source, reviews read zero external contents and validate only the report, ledger, and carried evidence. The corrector never reads external contents.

If the exact current state is already recorded and there are no directives, re-adjudication, or ledger migration, the writer forwards the existing bytes without serialization. Any real state change, including a method change or annotation-note change, updates the ledger deterministically but does not imply a source read. Keep state keys unique and cumulative.

## Report and ledger

- The sole runtime repository output is the requested repo-relative report, or `.scratch/research/<sanitized-repo-name>-ideas.md` by default. Store the ledger inside it. Create no sidecar or other repository artifact.
- Keep these ordered report areas: Source and current result; Recommended lint rules; Other ideas; decision and history evidence; Coverage and limits; Research ledger.
- Keep these ordered ledger areas: Baseline; Coverage lanes; Candidate register; Open gaps; State decision and history.
- Baseline includes the candidate namespace, source identities, Better TypeScript and method fingerprints, scope signature, annotation hash, state key, and mode.
- The sole authoritative Coverage lanes table is in `Research ledger > Coverage lanes`; `Coverage and limits` is prose summary only and must not duplicate the table. Use these columns in this exact order: `Lane`, `Kind`, `Include globs`, `Exclude globs`, `Covered evidence`, `State`, `Source SHA`, `Gap IDs`. Use only `other` or `lint` for `Kind`. Sort rows by `Lane` UTF-8 bytes; sort globs, evidence references, and gap IDs deterministically within cells.
- Use these Candidate register columns in this exact order: `ID`, `Kind`, `Key`, `Disposition`, `Overlap`, `Annotation`, `Last source SHA`, `Revisit triggers`. Sort rows by stable ID UTF-8 bytes. Sort open gaps by gap ID UTF-8 bytes. Keep state keys unique and cumulative. Add no timestamps or run counters.
- Current recommendations contain `ACCEPT` candidates and evidence-accepted unannotated candidates. `DENY` candidates appear only in history and the register.
- Keep current human annotation lines adjacent to their candidate detail and byte-exact.
- Markdown uses LF, one final newline, and stable heading, field, and table order. When a write is needed, serialize deterministically. For a complete identical state, do not serialize: forward the existing bytes and their hash.
- A review correction may change only the report. It cannot launch research, alter current annotation raw lines, or discard prior ledger state.
