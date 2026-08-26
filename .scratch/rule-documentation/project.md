# Rule documentation project

## Project state

- Status: Done (15 Done; 0 Ready)
- Record owner: Project orchestrator
- Current workflow step: `report-project-result` complete
- Repository: `/Users/andrueanderson/Workspace/better-typescript`
- Branch policy: Work on the current branch. Leave changes uncommitted.
- Due: None stated

## Authoritative request

> For each rule listed in the published rules documentation, link its catalog entry to a rule-specific page. Every page must explain what the rule does, when to use it, and show Conformant and Non-conformant code derived from the rule's actual implementation and fixtures. Parallelize the work.

## Outcome

Readers can open a concise, source-accurate page for every published built-in rule directly from the rule catalog. The complete documentation site builds and passes the repository checks.

## Completion criteria

- [x] The 131 rule slugs in `docs/rules.md` still form one complete, unique, sorted catalog.
- [x] Every catalog entry is a working link to exactly one `docs/rules/<slug>.md` page.
- [x] The page set and the catalog set are equal. No listed rule lacks a page. No extra rule page exists.
- [x] Every page follows the shared page contract below.
- [x] A fresh reviewer verifies all 131 pages against the corresponding implementation, tests, and fixtures. The review has a 131-row source-fidelity matrix with zero failures.
- [x] VitePress reports no broken documentation link and `bun run docs:build` passes.
- [x] `./scripts/check.sh` passes from the repository root.
- [x] An independent project review verifies these criteria and the outcome before completion is claimed.

## Governing context

Use these sources directly. Do not rely on the conversation or duplicate rule behavior from memory.

- Repository instructions: `AGENTS.md`
- Published catalog and authoritative slug order: `docs/rules.md`
- Site configuration: `docs/.vitepress/config.mts`
- Built-in catalog wiring: `internal/rules/catalog.go` and `internal/rules/catalog_test.go`
- Per-rule behavior: all production `.go` implementation files in `internal/rules/<rule_name>/`, excluding `*_test.go`, regardless of filename
- Per-rule expectations: all `*_test.go` files in `internal/rules/<rule_name>/`
- Per-rule examples and project shapes: `internal/rules/<rule_name>/testdata/`
- Task lifecycle and field meanings: `.agents/skills/manage-project/references/ai-agent-processes.md`
- Validation command required by `AGENTS.md`: `./scripts/check.sh`

At initialization, `docs/rules.md` contained 131 unique sorted slugs. They matched the 131 `internal/rules/` packages after replacing hyphens with underscores. Recheck this fact during validation.

## Shared page contract

For each assigned slug `<slug>`:

1. Create only `docs/rules/<slug>.md` for that rule. Do not edit shared catalog or site files in a page-group task.
2. Use `# <slug>` as the exact page title.
3. Include these sections once and in this order: `## What it does`, `## When to use it`, `## Conformant`, and `## Non-conformant`.
4. Keep the prose extremely simple and concise.
5. Put at least one fenced `ts` code example under both code sections.
6. Derive every behavioral claim and example from all production `.go` implementation files in the corresponding package, excluding `*_test.go`, plus its `*_test.go` files and `testdata/`. Small reductions or renames are allowed only when they preserve the tested rule boundary.
7. Do not claim behavior that the implementation does not enforce. Include important allowed shapes or limits when the tests or fixtures establish them.
8. Do not change Go code, fixtures, tests, dependencies, or unrelated documentation.

## Decomposition and parallelism

The published, already sorted slug list is split into 12 contiguous groups of at most 11 rules. This balances worker load, keeps ownership disjoint, and lets every page-group task run in parallel. The integration task owns the only shared site files. Validation tasks wait for the candidate pages, then use separate evidence files.

## Preparation audit

- Checked on: 2026-08-26
- Owners: `rule-docs-writer-01` through `rule-docs-writer-12`, `rule-docs-catalog-integrator`, `rule-docs-source-validator`, and `rule-docs-site-validator`; each label owns exactly one task.
- Catalog: `docs/rules.md` has 131 unique sorted slugs. They equal the 131 normalized package names in `internal/rules/`.
- Rule sources: all 131 package directories, production Go implementation files, tests, and non-empty fixture directories are readable. Eighty-two packages use `rule.go`. Forty-nine packages use a slug-named production file. Both layouts satisfy the source requirement.
- Documentation inputs at initial preparation: `AGENTS.md`, `docs/rules.md`, `docs/.vitepress/config.mts`, `package.json`, and `scripts/check.sh` were readable. `docs/rules/` did not exist yet.
- Environment: repository, `docs/`, and `.scratch/rule-documentation/` are writable. `git`, Bun 1.4.0, VitePress, `mise`, and Go 1.26.7 through `mise exec go@1.26` are available.
- Initially ready: `DOC-01` through `DOC-13`.
- Initially blocked: `DOC-14` and `DOC-15` lacked candidate dependencies.

## Completed validation-wave preparation (historical)

- Checked on: 2026-08-26
- `DOC-14` and `DOC-15` passed the Ready gate and launched concurrently.
- `DOC-14` completed with FAIL. Its report has 131 rows, 39 failed pages, and 46 failed axis judgments.
- `DOC-15` completed with PASS. Its evidence remains valid for the pre-correction candidate but cannot satisfy final acceptance after page edits.

## Corrective-wave preparation (historical)

- Checked on: 2026-08-26
- Trigger: DOC-14 failed 39 pages and 46 axis judgments (`What it does`: 36; `When to use it`: 8; Conformant: 1; Non-conformant: 1).
- Ready gate: `DOC-01` through `DOC-06` and `DOC-08` through `DOC-12` pass the corrective Ready gate. Each has one fresh unique owner, readable exact corrections and source inputs, writable disjoint page paths, no uncleared dependency, one concrete next action, and a completion event.
- Preserved Done tasks: `DOC-07` is unaffected. `DOC-13` remains Done because catalog targets do not change.
- Blocked validation: `DOC-14` waits for every corrective task to return to Done. `DOC-15` waits for corrections and must rerun because its retained PASS predates the edits.
- Routing: Launch all 11 Ready correction tasks concurrently. Do not edit rule pages or evidence during preparation.

### Corrective launch matrix

| Task | Status | Fresh owner | Failed slugs only | Launch event | Completion event |
| --- | --- | --- | --- | --- | --- |
| `DOC-01` | Ready | `rule-docs-corrector-01` | `boundary-schema-decode`<br>`cache-preference`<br>`closed-abstraction`<br>`config-refined-values`<br>`dependent-layer-merge`<br>`function-derived-model` | Launch concurrently in corrective wave | Explicit correction reply plus review of 6 corrected pages |
| `DOC-02` | Ready | `rule-docs-corrector-02` | `global-config-mutation`<br>`handrolled-ttl-cache`<br>`http-client-preference`<br>`http-response-validation`<br>`inflight-dedupe-map`<br>`layer-forever-acquisition`<br>`missing-rationale` | Launch concurrently in corrective wave | Explicit correction reply plus review of 7 corrected pages |
| `DOC-03` | Ready | `rule-docs-corrector-03` | `no-first-party-schema-declare` | Launch concurrently in corrective wave | Explicit correction reply plus review of 1 corrected page |
| `DOC-04` | Ready | `rule-docs-corrector-04` | `no-instanceof` | Launch concurrently in corrective wave | Explicit correction reply plus review of 1 corrected page |
| `DOC-05` | Ready | `rule-docs-corrector-05` | `no-pass-through-object-wrappers`<br>`no-raw-object-types`<br>`no-trivial-effect-fn`<br>`no-unsafe-effect-apis` | Launch concurrently in corrective wave | Explicit correction reply plus review of 4 corrected pages |
| `DOC-06` | Ready | `rule-docs-corrector-06` | `observable-worker-failure`<br>`prefer-composed-callbacks`<br>`prefer-curried-data-last-functions` | Launch concurrently in corrective wave | Explicit correction reply plus review of 3 corrected pages |
| `DOC-08` | Ready | `rule-docs-corrector-07` | `prefer-eta-reduction`<br>`prefer-hash-map`<br>`prefer-hash-set` | Launch concurrently in corrective wave | Explicit correction reply plus review of 3 corrected pages |
| `DOC-09` | Ready | `rule-docs-corrector-08` | `prefer-inferred-types`<br>`prefer-result-concept-names`<br>`prefer-schema-tagged-struct`<br>`raw-fetch-abort-signal` | Launch concurrently in corrective wave | Explicit correction reply plus review of 4 corrected pages |
| `DOC-10` | Ready | `rule-docs-corrector-09` | `redundant-alias`<br>`require-callable-role-name-consistency`<br>`require-command-name-consistency`<br>`require-conversion-direction-consistency`<br>`require-predicate-name-consistency` | Launch concurrently in corrective wave | Explicit correction reply plus review of 5 corrected pages |
| `DOC-11` | Ready | `rule-docs-corrector-10` | `require-result-shape-name-consistency`<br>`schema-optional-key`<br>`schema-record-interface`<br>`service-method-effect-fn` | Launch concurrently in corrective wave | Explicit correction reply plus review of 4 corrected pages |
| `DOC-12` | Ready | `rule-docs-corrector-11` | `unused-field` | Launch concurrently in corrective wave | Explicit correction reply plus review of 1 corrected page |
## Final validation-wave preparation (historical)

- Checked on: 2026-08-26
- Candidate dependency: `DOC-01` through `DOC-13` are Done. The 39 failed pages were reviewed against every exact `DOC-14` correction. No candidate dependency remains.
- Candidate inputs: all 131 `docs/rules/*.md` pages, all 131 rule package directories, 131 production Go files, 131 test files, and 369 fixture files are readable. `AGENTS.md`, `docs/rules.md`, `docs/.vitepress/config.mts`, `package.json`, and `scripts/check.sh` are readable.
- Owners: `rule-docs-source-validator` remains accountable for `DOC-14`; `rule-docs-site-validator` remains accountable for `DOC-15`. Each owns only one validation task. Use fresh clean-context executions for both final reruns.
- Tools and environment: the repository root is accessible and writable. Git, Bun, VitePress, `mise`, Bash, and executable `scripts/check.sh` are available. Go 1.26 is invoked through the recorded `mise exec go@1.26` path in `scripts/check.sh`.
- Evidence destinations: `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/site-validation.md` exist, are readable and writable, and their parent directory is writable.
- Ready decision: both tasks pass the complete Ready gate. Their definitions, inputs, owners, dependencies, tools, evidence destinations, and next actions are explicit and available now.
- Required freshness: the retained source-fidelity FAIL and the pre-correction site PASS are historical only. Final acceptance requires a new 131-row source-fidelity report with zero failures and a new complete site/repository rerun against this final candidate.

## Second corrective-wave preparation

- Checked on: 2026-08-26
- Trigger: The fresh final `DOC-14` rerun returned FAIL with 21 failed pages and 22 failed axis judgments (`What it does`: 21; `When to use it`: 1).
- Ready gate: Only affected `DOC-01`, `DOC-03`, `DOC-04`, `DOC-07`, `DOC-08`, `DOC-09`, `DOC-10`, and `DOC-11` return to Ready. Each has a fresh unique owner, readable verbatim current correction text and source inputs, writable disjoint page paths, cleared dependencies, an executable next action, and a concrete completion event.
- Preserved Done tasks: Unaffected page groups `DOC-02`, `DOC-05`, `DOC-06`, and `DOC-12` remain Done. `DOC-13` remains Done because catalog targets do not change.
- Blocked validation: `DOC-14` is Blocked until all eight second-correction tasks are Done, then requires a fresh 131-row, four-axis rerun with zero failures. `DOC-15` is reopened as Blocked because its PASS predates these new edits; it requires a fresh final full rerun after all eight corrections are Done.
- Scope control: Correctors may edit only the 21 failed pages and only the 22 failed axes listed verbatim below. They must not edit evidence, shared catalog files, rule sources, or unaffected page content.
- Project summary: 5 Done, 8 Ready, 2 Blocked. The next wave has 8 fresh correctors, 21 page edits, and 22 axis corrections.

### Second corrective launch matrix

| Task | Status | Fresh owner | Failed slugs and axes only | Launch event | Completion event |
| --- | --- | --- | --- | --- | --- |
| `DOC-01` | Ready | `rule-docs-corrector2-01` | `cache-preference` — `What it does`<br>`dependent-layer-merge` — `What it does`<br>`duplicate-shape` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 3 pages / 3 axes |
| `DOC-03` | Ready | `rule-docs-corrector2-02` | `no-callbacks` — `What it does`<br>`no-duplicate-if-bodies` — `What it does`<br>`no-immediate-effect-sync` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 3 pages / 3 axes |
| `DOC-04` | Ready | `rule-docs-corrector2-03` | `no-inline-closures` — `What it does`<br>`no-mutation` — `What it does`<br>`no-nested-calls` — `What it does`<br>`no-nested-if-statements` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 4 pages / 4 axes |
| `DOC-07` | Ready | `rule-docs-corrector2-04` | `prefer-effect-array-count-by` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 1 page / 1 axis |
| `DOC-08` | Ready | `rule-docs-corrector2-05` | `prefer-effect-schema-is` — `What it does`<br>`prefer-function-composition` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 2 pages / 2 axes |
| `DOC-09` | Ready | `rule-docs-corrector2-06` | `prefer-inferred-types` — `What it does`, `When to use it`<br>`process-environment` — `What it does`<br>`raw-fetch-abort-signal` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 3 pages / 4 axes |
| `DOC-10` | Ready | `rule-docs-corrector2-07` | `require-blank-lines-around-multiline-declarations` — `What it does`<br>`require-conversion-direction-consistency` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 2 pages / 2 axes |
| `DOC-11` | Ready | `rule-docs-corrector2-08` | `require-result-shape-name-consistency` — `What it does`<br>`schema-optional-key` — `What it does`<br>`service-method-effect-fn` — `What it does` | Launch concurrently in second corrective wave | Explicit correction reply plus review of 3 pages / 3 axes |

## Third validation-wave preparation (historical)

- Checked on: 2026-08-26
- Candidate dependency: Parent review confirms all affected `DOC-01`, `DOC-03`, `DOC-04`, `DOC-07`, `DOC-08`, `DOC-09`, `DOC-10`, and `DOC-11` second corrections are Done. All `DOC-01` through `DOC-13` are Done. No candidate dependency remains.
- Actual candidate inputs: all 131 current `docs/rules/*.md` pages, 131 rule package directories, 131 production Go files, 131 test files, and 369 fixture files are readable. `AGENTS.md`, `docs/rules.md`, `docs/.vitepress/config.mts`, `package.json`, and `scripts/check.sh` are readable.
- Owners: `rule-docs-source-validator` owns only `DOC-14` and continues accepted accountability. `rule-docs-site-validator` owns only `DOC-15` and continues accepted accountability. Both reruns must use new clean-context executions.
- Tools and environment: the repository root and `.scratch/rule-documentation/evidence/` are accessible and writable. Git, Bun, VitePress, `mise`, Bash, and executable `scripts/check.sh` are available. The required repository check invokes Go 1.26 through `mise exec go@1.26`.
- Evidence destinations: `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/site-validation.md` exist and are readable and writable. `DOC-14` replaces its historical FAIL with the fresh matrix. `DOC-15` appends the fresh rerun without deleting historical evidence.
- Ready decision: `DOC-14` and `DOC-15` pass the complete Ready gate. Their tasks, outcomes, definitions of done, inputs, owners, dependencies, tools, permissions, evidence paths, and next actions are explicit and available now.
- Freshness requirement: `DOC-14` requires a new clean-context, exactly 131-row, four-axis source review with zero missing rows, zero duplicate rows, and zero failed judgments. `DOC-15` requires a new full deterministic site and repository rerun against the same current candidate, including the build, repository check, diff, and scope checks. Historical evidence cannot satisfy either task.

## Material corrective-wave preparation

- Checked on: 2026-08-26
- Trigger: Independent adjudication reviewed all 91 third-report findings. It confirmed 25 judgments on 21 pages and rejected 66 findings that demanded exhaustive incidental implementation detail without showing false concise guidance.
- Ready decision: Only affected `DOC-01`, `DOC-02`, `DOC-03`, `DOC-05`, `DOC-06`, `DOC-07`, `DOC-08`, `DOC-09`, `DOC-11`, and `DOC-12` return to Ready. Each task has one fresh unique owner, readable verbatim corrections, readable source inputs, writable disjoint page paths, no dependency, one executable next action, and one concrete completion event.
- Preserved Done tasks: `DOC-04`, `DOC-10`, and `DOC-13` remain Done. Their third-report findings were rejected or their shared catalog work is unaffected.
- Blocked validation: `DOC-14` waits for all ten correction tasks, then uses the material-failure standard recorded in its task. `DOC-15` is reopened as Blocked and requires a fresh full rerun after final edits.
- Scope control: Correctors may edit only the 21 named pages and 25 named axes. They must apply the adjudication report's verbatim exact corrections. They must not edit rejected findings, unaffected content, shared catalog files, rule sources, fixtures, tests, project records, or evidence.
- Evidence: Preserve `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` as the third-report and adjudication record.
- Project summary: 3 Done, 10 Ready, 2 Blocked. The next wave has 10 fresh correctors, 21 pages, and 25 axis corrections.
- Current step: `execute-rule-docs-material-corrections`; launch all ten Ready tasks concurrently under their assigned fresh owners.

### Material corrective launch matrix

| Task | Status | Fresh owner | Confirmed slugs and axes only | Completion event |
| --- | --- | --- | --- | --- |
| `DOC-01` | Ready | `rule-docs-material-corrector-01` | `bounded-retry-schedule` — `What it does`<br>`duplicate-shape` — `What it does`<br>`effect-fn-name` — `What it does`<br>`effect-test-style` — `What it does` | Explicit reply plus review of 4 page(s) / 4 axis correction(s) |
| `DOC-02` | Ready | `rule-docs-material-corrector-02` | `http-status-decode-order` — `What it does`<br>`no-blank-lines-between-single-line-declarations` — `What it does` | Explicit reply plus review of 2 page(s) / 2 axis correction(s) |
| `DOC-03` | Ready | `rule-docs-material-corrector-03` | `no-duplicate-function-names` — `When to use it`<br>`no-immediate-effect-sync` — `What it does` | Explicit reply plus review of 2 page(s) / 2 axis correction(s) |
| `DOC-05` | Ready | `rule-docs-material-corrector-04` | `no-reexports` — `What it does`<br>`no-unsafe-effect-apis` — `What it does` | Explicit reply plus review of 2 page(s) / 2 axis correction(s) |
| `DOC-06` | Ready | `rule-docs-material-corrector-05` | `no-value-aliases` — `What it does`<br>`prefer-curried-data-last-functions` — `What it does` | Explicit reply plus review of 2 page(s) / 2 axis correction(s) |
| `DOC-07` | Ready | `rule-docs-material-corrector-06` | `prefer-effect-array-append-all` — `What it does`, `When to use it`<br>`prefer-effect-function-constant` — `What it does`, `When to use it` | Explicit reply plus review of 2 page(s) / 4 axis correction(s) |
| `DOC-08` | Ready | `rule-docs-material-corrector-07` | `prefer-function-flip` — `What it does` | Explicit reply plus review of 1 page(s) / 1 axis correction(s) |
| `DOC-09` | Ready | `rule-docs-material-corrector-08` | `prefer-inferred-types` — `What it does`, `When to use it`<br>`process-environment` — `What it does`<br>`raw-fetch-abort-signal` — `What it does`, `When to use it`<br>`raw-fetch-outside-adapter` — `What it does` | Explicit reply plus review of 4 page(s) / 6 axis correction(s) |
| `DOC-11` | Ready | `rule-docs-material-corrector-09` | `service-method-effect-fn` — `What it does` | Explicit reply plus review of 1 page(s) / 1 axis correction(s) |
| `DOC-12` | Ready | `rule-docs-material-corrector-10` | `unused-field` — `What it does` | Explicit reply plus review of 1 page(s) / 1 axis correction(s) |

## Final material-validation preparation

- Checked on: 2026-08-26
- Candidate dependency: Parent review confirms all 25 CONFIRMED judgments on 21 pages were corrected. All `DOC-01` through `DOC-13` are Done. No candidate dependency remains.
- Inputs: All 131 current `docs/rules/*.md` pages, 131 rule package directories, 131 production Go files, 131 test files, and 369 fixture files are readable. `AGENTS.md`, `docs/rules.md`, `docs/.vitepress/config.mts`, `package.json`, `scripts/check.sh`, both preserved source-fidelity reports, and the site-validation evidence are readable.
- Owners: `rule-docs-source-validator` remains the sole accountable owner of `DOC-14`. `rule-docs-site-validator` remains the sole accountable owner of `DOC-15`. Both final reruns use fresh clean-context executions.
- Tools and environment: The repository root and evidence directory are accessible and writable. Git, Bun, VitePress, `mise`, Bash, and executable `scripts/check.sh` are available. The repository check uses the recorded Go environment through `scripts/check.sh`.
- Evidence destinations: `.scratch/rule-documentation/evidence/source-fidelity-final.md` does not yet exist and its parent is writable. `.scratch/rule-documentation/evidence/site-validation.md` is readable and writable. `DOC-14` creates the final report without changing the two preserved reports. `DOC-15` appends its final rerun without deleting historical evidence.
- Ready decision: `DOC-14` and `DOC-15` pass the complete Ready gate. Their tasks, outcomes, definitions of done, inputs, owners, dependencies, tools, permissions, destinations, and next actions are explicit and available now.
- Final-review constraint: `DOC-14` applies the material-fidelity standard to all 131 pages. The adjudication's 66 REJECTED findings are fixed constraints and cannot be revived unless a later page change introduced a new contradiction.

## Routing plan

- Launch `DOC-14` and `DOC-15` concurrently under fresh clean-context executions for their recorded owners.
- Give `DOC-14` this record, the Shared page contract, all 131 pages and matching rule sources, both prior source-fidelity reports, and only its final evidence destination.
- Give `DOC-15` this record, the complete site and repository inputs, and its append-only evidence destination.
- Review each completion event against its full definition of done before changing either task to Done.
- Preserve both source-fidelity reports. Write final source-fidelity results to the separate path recorded in `DOC-14` and append final site results as recorded in `DOC-15`.

### Historical initial and validation launch matrix

| Wave | Task | Fresh capability route | Capacity | Launch or resume event | Completion event |
| --- | --- | --- | --- | --- | --- |
| Initial | `DOC-01` | `rule-docs-writer-01` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-02` | `rule-docs-writer-02` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-03` | `rule-docs-writer-03` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-04` | `rule-docs-writer-04` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-05` | `rule-docs-writer-05` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-06` | `rule-docs-writer-06` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-07` | `rule-docs-writer-07` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-08` | `rule-docs-writer-08` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-09` | `rule-docs-writer-09` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-10` | `rule-docs-writer-10` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-11` | `rule-docs-writer-11` | 1 writer; 11 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 11 disjoint page files |
| Initial | `DOC-12` | `rule-docs-writer-12` | 1 writer; 10 pages | Launch concurrently with all other initial tasks | Explicit writer reply plus the 10 disjoint page files |
| Initial | `DOC-13` | `rule-docs-catalog-integrator` | 1 integrator; 131 links | Launch concurrently with all other initial tasks | Explicit integrator reply plus the catalog diff and count/order evidence |
| Validation | `DOC-14` | `rule-docs-source-validator` | 1 independent validator; 131 rows | Reapply Ready gate and launch when all `DOC-01` through `DOC-12` candidate pages exist | Explicit validator reply plus `.scratch/rule-documentation/evidence/source-fidelity.md` |
| Validation | `DOC-15` | `rule-docs-site-validator` | 1 independent validator; deterministic checks and commands | Reapply Ready gate and launch when all `DOC-01` through `DOC-13` candidate results exist | Explicit validator reply plus `.scratch/rule-documentation/evidence/site-validation.md` |

## Tasks
### DOC-01: Apply adjudicated material source-fidelity corrections for bounded-retry-schedule through effect-test-style

- Status: Done
- Owner: rule-docs-material-corrector-01
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 4 materially false, contradictory, over-broad, or misleading judgment(s) on 4 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 4 page(s):
    - `docs/rules/bounded-retry-schedule.md`
    - `docs/rules/duplicate-shape.md`
    - `docs/rules/effect-fn-name.md`
    - `docs/rules/effect-test-style.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-01`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `bounded-retry-schedule` — `What it does`: Replace the first sentence with: “Reports bare `retry(...)` and exact-identifier `Effect.retry(...)` calls when the syntactically selected policy fails a textual bound heuristic. An object first argument is the policy; otherwise argument 2 is used when present, or a sole non-function argument is used. A non-object is allowed when its raw text contains a listed bound word. An object is allowed by a numeric/identifier `times`, any `while` or `until`, a bounded `schedule`, or no `schedule`.”
  - `duplicate-shape` — `What it does`: Replace the first sentence with: “Groups project interfaces and type aliases by normalized source shape. For each shape, the lexicographically smallest `filename:name` key is silent; a matching declaration reports only when its key differs from that selected key. Declarations sharing the selected key are also silent.”
  - `effect-fn-name` — `What it does`: Replace the opening with: “Reports a missing or invalid name on an `Effect.fn(...)` builder only when that builder is immediately invoked. Separately, it reports a direct arrow function, function expression, or object-literal first argument as unnamed even without an outer invocation. Matching is textual on property-access receivers ending in `Effect`; a string is accepted when it begins with two non-empty dot-separated parts.”
  - `effect-test-style` — `What it does`: Replace the first sentence with: “Reports the listed plain `it` call forms only when the call contains an inline arrow-function or function-expression callback—the rightmost such argument—whose rendered return type contains `Effect` or whose raw callback text contains `Effect.`. The file gate is a raw `@effect/vitest` substring.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/bounded-retry-schedule.md` and `internal/rules/bounded_retry_schedule/`
  - `docs/rules/duplicate-shape.md` and `internal/rules/duplicate_shape/`
  - `docs/rules/effect-fn-name.md` and `internal/rules/effect_fn_name/`
  - `docs/rules/effect-test-style.md` and `internal/rules/effect_test_style/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/bounded-retry-schedule.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 4 page(s) and 4 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-01` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-01`'s explicit reply naming `DOC-01`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed all four exact adjudicated opening corrections are present verbatim, while remaining prose/examples and every page contract are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-02: Apply adjudicated material source-fidelity corrections for http-status-decode-order through no-blank-lines-between-single-line-declarations

- Status: Done
- Owner: rule-docs-material-corrector-02
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 2 materially false, contradictory, over-broad, or misleading judgment(s) on 2 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 2 page(s):
    - `docs/rules/http-status-decode-order.md`
    - `docs/rules/no-blank-lines-between-single-line-declarations.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-02`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `http-status-decode-order` — `What it does`: Replace the first paragraph with: “In the nearest enclosing function, reports calls ending in `json`, `text`, `arrayBuffer`, `blob`, `formData`, or `bytes` when no earlier recursive AST visit sees a property named `status`, `ok`, or `statusText`, or a call named `filterStatusOk`, `filterStatus`, or `matchStatus`. It applies the same check to `decodeUnknown`, `decodeUnknownEffect`, `decode`, `decodeEffect`, `schemaBodyJson`, `schemaJson`, and `schemaNoBody` only when the function also contains a listed body/classifier call or `execute`, `get`, `post`, `put`, `patch`, or `del`. Names and order are syntactic; receivers, symbols, data flow, and control flow are not resolved.”
  - `no-blank-lines-between-single-line-declarations` — `What it does`: After the exact diagnostic quote, add: “Despite that help text, this rule does not enforce separators around multi-line declarations; any pair with a multi-line declaration is exempt.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/http-status-decode-order.md` and `internal/rules/http_status_decode_order/`
  - `docs/rules/no-blank-lines-between-single-line-declarations.md` and `internal/rules/no_blank_lines_between_single_line_declarations/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/http-status-decode-order.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 2 page(s) and 2 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-02` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-02`'s explicit reply naming `DOC-02`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed both adjudicated `What it does` corrections are present verbatim, including the syntactic AST-order warning and the diagnostic/enforcement contradiction; remaining material/page contracts are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-03: Apply adjudicated material source-fidelity corrections for no-duplicate-function-names through no-immediate-effect-sync

- Status: Done
- Owner: rule-docs-material-corrector-03
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 2 materially false, contradictory, over-broad, or misleading judgment(s) on 2 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 2 page(s):
    - `docs/rules/no-duplicate-function-names.md`
    - `docs/rules/no-immediate-effect-sync.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-03`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `no-duplicate-function-names` — `When to use it`: Replace the section with: “Use it to find same-name, mutually assignable top-level callables in different files as candidates for consolidation. The rule does not compare bodies or establish semantic equivalence. Types that are not mutually assignable in both directions are allowed.”
  - `no-immediate-effect-sync` — `What it does`: Replace that sentence with: “A local lookalike is allowed when its spelling was not registered by a recognized import. A declaration that shadows a registered import spelling can still match because callee matching is textual.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/no-duplicate-function-names.md` and `internal/rules/no_duplicate_function_names/`
  - `docs/rules/no-immediate-effect-sync.md` and `internal/rules/no_immediate_effect_sync/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/no-duplicate-function-names.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 2 page(s) and 2 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-03` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-03`'s explicit reply naming `DOC-03`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed both exact adjudicated corrections are present, removing the semantic-equivalence promise and qualifying import-spelling shadow behavior; all other material/page contracts are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-04: Apply second source-fidelity corrections for no-inline-closures through no-nested-if-statements

- Status: Done
- Owner: rule-docs-corrector2-03
- Completion event: Second-corrector reply received and reviewed.
- Completion event: Receipt of `rule-docs-corrector2-03`'s explicit reply naming `DOC-04`, every corrected path and axis, and confirmation that no other file changed; then orchestrator diff review confirms all 4 listed judgments and the shared page contract.
- Previous candidate: This page group was Done after the first corrective wave. The fresh final `DOC-14` rerun returned it to Ready only for the 4 failed page(s) and 4 failed axis judgment(s) below.
- Preparation check: Ready gate passed on 2026-08-26. The narrow task, outcome, definition of done, and verbatim current correction text are clear. Fresh unique owner `rule-docs-corrector2-03` accepts accountability for this task only. The failed pages, current `DOC-14` report, governing instructions, implementations, tests, and fixtures are readable. The listed page paths are writable and disjoint from every other Ready task. No dependency remains. The tools and repository environment are available. The next action can run now without hidden context.
- Task: Apply only the verbatim current `DOC-14` correction text below to the listed failed axes. Do not change passed axes, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or evidence files.
- Outcome: These failed axes match the source boundaries recorded by the fresh `DOC-14` rerun without expanding the page-group scope.
- Definition of done:
  - [ ] Apply every listed correction to its named failed axis only.
  - [ ] Change only these 4 rule page(s):
    - `docs/rules/no-inline-closures.md`
    - `docs/rules/no-mutation.md`
    - `docs/rules/no-nested-calls.md`
    - `docs/rules/no-nested-if-statements.md`
  - [ ] Keep every corrected page within the shared page contract.
  - [ ] Reply with `DOC-04`, corrected paths and axes, corrections applied, and confirmation that no other file changed.
- Correction scope (verbatim from the current `DOC-14` report):
  - `no-inline-closures`:
    - **What it does: FAIL.** The currying exemption applies only when wrappers are removed and the arrow’s effective immediate parent is another arrow. A block-bodied curried function returning an arrow is reported. State the concise nested-arrow limit.
  - `no-mutation`:
    - **What it does: FAIL.** The page says built-in data is controlled. Only ECMAScript/decorator library declarations (`lib.es*`, `lib.decorators*`, `lib.d.ts`) count as controlled; other libraries such as `lib.dom.d.ts` are treated as uncontrolled external declarations.
  - `no-nested-calls`:
    - **What it does: FAIL.** The rule walks only specific argument-ancestor shapes, and the `pipe` exemption requires the nested call to be the direct, unwrapped first argument. Parenthesized first arguments can report, while unsupported ancestry such as a computed property name is not traversed.
  - `no-nested-if-statements`:
    - **What it does: FAIL.** The exception is broader than syntactic `else if`: any nested `if` reached through an outer else branch can be allowed, including inside an `else { ... }` block. Describe the outer-else-branch exemption.
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `docs/rules/no-inline-closures.md`
  - `internal/rules/no_inline_closures/`
  - `docs/rules/no-mutation.md`
  - `internal/rules/no_mutation/`
  - `docs/rules/no-nested-calls.md`
  - `internal/rules/no_nested_calls/`
  - `docs/rules/no-nested-if-statements.md`
  - `internal/rules/no_nested_if_statements/`
- Dependencies: None. The current `DOC-14` failure report exists and provides exact corrections. This task owns disjoint page paths.
- Next action: Edit `docs/rules/no-inline-closures.md` only at its listed failed axis, using the verbatim correction text above, then continue through the remaining listed failed axes only.
- Due: None stated
- Priority: P0 corrective critical path. `DOC-14` and `DOC-15` wait for all eight second-correction tasks.
- Effort: Correct 4 failed page(s) and 4 failed axis judgment(s); self-check only the listed corrections and shared contract.
- Scheduled: Second corrective wave. Launch concurrently with the other seven Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from source-fidelity evidence; source-aware TypeScript documentation editing.
- Delegation: Fresh owner `rule-docs-corrector2-03` edits only this task's disjoint failed page paths.
- Review or follow-up: Review immediately on the completion event. Move to Done only when the narrow definition of done and outcome pass. If review fails, return this task to Ready with the exact remaining axis correction.
- Evidence: The current 131-row FAIL and its exact failed judgments remain in `.scratch/rule-documentation/evidence/source-fidelity.md`. Passed axes and unaffected pages remain accepted candidate work. Parent review confirmed all four current `What it does` corrections match every listed parent/library/ancestry/else-branch boundary; passed axes/examples remain unchanged and all page contracts are valid.
- Tags: `rule-docs`, `page-group`, `second-correction`

### DOC-05: Apply adjudicated material source-fidelity corrections for no-reexports through no-unsafe-effect-apis

- Status: Done
- Owner: rule-docs-material-corrector-04
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 2 materially false, contradictory, over-broad, or misleading judgment(s) on 2 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 2 page(s):
    - `docs/rules/no-reexports.md`
    - `docs/rules/no-unsafe-effect-apis.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-05`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `no-reexports` — `What it does`: Replace with: “Reports `export *`, namespace exports, and named specifiers in `export { ... } from`. It also reports local named export specifiers and bare-identifier export assignments whose local text matches a top-level default, namespace, or named ES-import binding. It does not resolve symbols, collect `import =` bindings, or inspect member or compound export-assignment expressions.”
  - `no-unsafe-effect-apis` — `What it does`: Replace with: “Reports resolved identifiers in value and ordinary type-reference positions, except identifiers whose direct parent is a supported import/export form or `TypeQuery`. It also reports property accesses and string-literal element accesses, including those inside type queries, when the resolved Effect symbol name contains `unsafe` case-insensitively.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/no-reexports.md` and `internal/rules/no_reexports/`
  - `docs/rules/no-unsafe-effect-apis.md` and `internal/rules/no_unsafe_effect_apis/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/no-reexports.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 2 page(s) and 2 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-04` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-04`'s explicit reply naming `DOC-05`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed both exact adjudicated `What it does` replacements are present verbatim, including local export/text and type-query behavior; remaining material/page contracts are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-06: Apply adjudicated material source-fidelity corrections for no-value-aliases through prefer-curried-data-last-functions

- Status: Done
- Owner: rule-docs-material-corrector-05
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 2 materially false, contradictory, over-broad, or misleading judgment(s) on 2 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 2 page(s):
    - `docs/rules/no-value-aliases.md`
    - `docs/rules/prefer-curried-data-last-functions.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-06`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `no-value-aliases` — `What it does`: Replace with: “Reports an identifier-named `const` whose whole initializer, after outer parentheses, assertion, `satisfies`, and non-null wrappers are removed, is a bare identifier or a non-optional dot-property chain with identifier/dot-property receivers. Element access and wrappers inside a property-chain receiver are not checked.”
  - `prefer-curried-data-last-functions` — `What it does`: Replace the exception with: “except contextually typed arrows/function expressions and named functions with at least one reference, where every reference is a direct call argument and that call’s resolved signature is declared in a `.d.ts` or default-library file. The receiving parameter is not checked to be callable.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/no-value-aliases.md` and `internal/rules/no_value_aliases/`
  - `docs/rules/prefer-curried-data-last-functions.md` and `internal/rules/prefer_curried_data_last_functions/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/no-value-aliases.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 2 page(s) and 2 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-05` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-05`'s explicit reply naming `DOC-06`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed both exact adjudicated corrections are present, including whole-initializer unwrapping and the non-callable contextual-use exception; all other material/page contracts are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-07: Apply adjudicated material source-fidelity corrections for prefer-effect-array-append-all through prefer-effect-function-constant

- Status: Done
- Owner: rule-docs-material-corrector-06
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 4 materially false, contradictory, over-broad, or misleading judgment(s) on 2 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 2 page(s):
    - `docs/rules/prefer-effect-array-append-all.md`
    - `docs/rules/prefer-effect-function-constant.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-07`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `prefer-effect-array-append-all` — `What it does`: Replace with: “Reports an array spread whose conditional expression has one arm that is exactly an empty array literal and another arm that is not an empty array literal, after unwrapping parentheses.”
  - `prefer-effect-array-append-all` — `When to use it`: Replace with: “Use it for a conditional array spread whose one arm is exactly `[]` and whose other arm is not an empty array literal. Either arm may be selected when the written condition is true.”
  - `prefer-effect-function-constant` — `What it does`: Replace the opening with: “Reports a synchronous, non-generator, non-generic zero-argument arrow or function expression with a concise expression body or exactly one `return`, when the returned value unwraps to a string/template/numeric/bigint/boolean/null literal or to an identifier for an earlier single-declaration same-file `const`.”
  - `prefer-effect-function-constant` — `When to use it`: Replace it with: “Use it for the synchronous, non-generator, non-generic constant-thunk shapes reported by this rule.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/prefer-effect-array-append-all.md` and `internal/rules/prefer_effect_array_append_all/`
  - `docs/rules/prefer-effect-function-constant.md` and `internal/rules/prefer_effect_function_constant/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/prefer-effect-array-append-all.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 2 page(s) and 4 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-06` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-06`'s explicit reply naming `DOC-07`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed all four exact adjudicated corrections are present, avoiding runtime non-empty and async/generator/generic overclaims; remaining material/page contracts are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-08: Apply adjudicated material source-fidelity corrections for prefer-function-flip

- Status: Done
- Owner: rule-docs-material-corrector-07
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 1 materially false, contradictory, over-broad, or misleading judgment(s) on 1 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 1 page(s):
    - `docs/rules/prefer-function-flip.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-08`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `prefer-function-flip` — `What it does`: Replace the first paragraph with: “Reports expression-bodied unary arrows whose outer call has one fixed argument and whose inner call passes the parameter as its sole argument, when the inner callee is not a dot-property access. The parameter must be plain, required, and the only same-spelled identifier use; the fixed argument must not use that spelling. Direct partial application and dot-property callees are allowed; element-access calls can report.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/prefer-function-flip.md` and `internal/rules/prefer_function_flip/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/prefer-function-flip.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 1 page(s) and 1 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-07` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-07`'s explicit reply naming `DOC-08`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed the exact adjudicated `What it does` correction is present, including dot-property versus element-access behavior; all other material and the page contract are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-09: Apply adjudicated material source-fidelity corrections for prefer-inferred-types through raw-fetch-outside-adapter

- Status: Done
- Owner: rule-docs-material-corrector-08
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 6 materially false, contradictory, over-broad, or misleading judgment(s) on 4 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 4 page(s):
    - `docs/rules/prefer-inferred-types.md`
    - `docs/rules/process-environment.md`
    - `docs/rules/raw-fetch-abort-signal.md`
    - `docs/rules/raw-fetch-outside-adapter.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-09`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `prefer-inferred-types` — `What it does`: Replace the contextual-arrow sentence with: “A non-variable contextual arrow reports only when no earlier argument in the same call is `[]`, there is exactly one contextual signature, every parameter is explicitly annotated and its checker-rendered type text matches the contextual parameter type, and any return annotation is equivalent to the inferred single result.”
  - `prefer-inferred-types` — `When to use it`: Replace its final sentence with: “A non-variable contextual arrow is checked only when no earlier argument in the same call is `[]`, there is exactly one contextual signature, every parameter is explicitly annotated and its checker-rendered type text matches the contextual parameter type, and any return annotation is equivalent to the inferred single result.”
  - `process-environment` — `What it does`: Replace it with: “In a production path, reports a property or element-access chain rooted at dot `process.env` or string-element `process["env"]`, including assignment targets. Later element keys may be dynamic. Parentheses, `as`, and `satisfies` are skipped for outermost detection, but a non-null wrapper can cause both an inner and outer access to report.”
  - `raw-fetch-abort-signal` — `What it does`: Replace the opening with: “For an exact textual `Effect.tryPromise` or `tryPromise` call, scans the entire call text with `(?:\bfetch\|(?:globalThis\|window\|self)\.fetch)\s*\(`. This is not AST fetch recognition: it can match custom/qualified calls such as `client.fetch` or `$fetch` and text in comments or strings. Parameter extraction is also a whole-call regex and need not identify the callback parameter.” Keep the existing acceptance-regex caveat.
  - `raw-fetch-abort-signal` — `When to use it`: Replace it with: “Use this broad whole-call text check as a cancellation prompt around fetch-like text in `tryPromise`. It does not prove that the call is raw `fetch`, that the extracted name is the callback signal, or that an accepted `signal` occurrence is `fetch`’s `init.signal`.”
  - `raw-fetch-outside-adapter` — `What it does`: Replace it with: “Reports calls whose unresolved callee text is exactly `fetch`, `globalThis.fetch`, `window.fetch`, or `self.fetch`, unless the file has an exact `adapter`/`adapters` path segment or an exact textual `Effect.tryPromise`/`tryPromise` call ancestor is reached before crossing a non-immediate function-like ancestor. An expression-body callback can be exempt while a block-body callback reports.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/prefer-inferred-types.md` and `internal/rules/prefer_inferred_types/`
  - `docs/rules/process-environment.md` and `internal/rules/process_environment/`
  - `docs/rules/raw-fetch-abort-signal.md` and `internal/rules/raw_fetch_abort_signal/`
  - `docs/rules/raw-fetch-outside-adapter.md` and `internal/rules/raw_fetch_outside_adapter/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/prefer-inferred-types.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 4 page(s) and 6 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-08` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-08`'s explicit reply naming `DOC-09`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed all six exact adjudicated corrections are present, including contextual-arrow, environment-chain, whole-call regex, and adapter/ancestor boundaries; all other material/page contracts are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-10: Apply second source-fidelity corrections for require-blank-lines-around-multiline-declarations through require-conversion-direction-consistency

- Status: Done
- Owner: rule-docs-corrector2-07
- Completion event: Second-corrector reply received and reviewed.
- Completion event: Receipt of `rule-docs-corrector2-07`'s explicit reply naming `DOC-10`, every corrected path and axis, and confirmation that no other file changed; then orchestrator diff review confirms all 2 listed judgments and the shared page contract.
- Previous candidate: This page group was Done after the first corrective wave. The fresh final `DOC-14` rerun returned it to Ready only for the 2 failed page(s) and 2 failed axis judgment(s) below.
- Preparation check: Ready gate passed on 2026-08-26. The narrow task, outcome, definition of done, and verbatim current correction text are clear. Fresh unique owner `rule-docs-corrector2-07` accepts accountability for this task only. The failed pages, current `DOC-14` report, governing instructions, implementations, tests, and fixtures are readable. The listed page paths are writable and disjoint from every other Ready task. No dependency remains. The tools and repository environment are available. The next action can run now without hidden context.
- Task: Apply only the verbatim current `DOC-14` correction text below to the listed failed axes. Do not change passed axes, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or evidence files.
- Outcome: These failed axes match the source boundaries recorded by the fresh `DOC-14` rerun without expanding the page-group scope.
- Definition of done:
  - [ ] Apply every listed correction to its named failed axis only.
  - [ ] Change only these 2 rule page(s):
    - `docs/rules/require-blank-lines-around-multiline-declarations.md`
    - `docs/rules/require-conversion-direction-consistency.md`
  - [ ] Keep every corrected page within the shared page contract.
  - [ ] Reply with `DOC-10`, corrected paths and axes, corrections applied, and confirmation that no other file changed.
- Correction scope (verbatim from the current `DOC-14` report):
  - `require-blank-lines-around-multiline-declarations`:
    - **What it does: FAIL.** The page says any multi-line declaration is checked. The listener checks only variable statements, functions, classes, interfaces, type aliases, enums, and modules. Name those seven forms.
  - `require-conversion-direction-consistency`:
    - **What it does: FAIL.** The page omits a tested entry boundary: conversion checks require a supported identifier-named callable with at least one parameter and a non-boolean return shape. Comparisons use the first parameter and explicit return-type text. The fixture allows zero-parameter `parseValue(): string`.
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `docs/rules/require-blank-lines-around-multiline-declarations.md`
  - `internal/rules/require_blank_lines_around_multiline_declarations/`
  - `docs/rules/require-conversion-direction-consistency.md`
  - `internal/rules/require_conversion_direction_consistency/`
- Dependencies: None. The current `DOC-14` failure report exists and provides exact corrections. This task owns disjoint page paths.
- Next action: Edit `docs/rules/require-blank-lines-around-multiline-declarations.md` only at its listed failed axis, using the verbatim correction text above, then continue through the remaining listed failed axes only.
- Due: None stated
- Priority: P0 corrective critical path. `DOC-14` and `DOC-15` wait for all eight second-correction tasks.
- Effort: Correct 2 failed page(s) and 2 failed axis judgment(s); self-check only the listed corrections and shared contract.
- Scheduled: Second corrective wave. Launch concurrently with the other seven Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from source-fidelity evidence; source-aware TypeScript documentation editing.
- Delegation: Fresh owner `rule-docs-corrector2-07` edits only this task's disjoint failed page paths.
- Review or follow-up: Review immediately on the completion event. Move to Done only when the narrow definition of done and outcome pass. If review fails, return this task to Ready with the exact remaining axis correction.
- Evidence: The current 131-row FAIL and its exact failed judgments remain in `.scratch/rule-documentation/evidence/source-fidelity.md`. Passed axes and unaffected pages remain accepted candidate work. Parent review confirmed both current `What it does` corrections match the failure details exactly; passed axes/examples remain unchanged and both page contracts are valid.
- Tags: `rule-docs`, `page-group`, `second-correction`

### DOC-11: Apply adjudicated material source-fidelity corrections for service-method-effect-fn

- Status: Done
- Owner: rule-docs-material-corrector-09
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 1 materially false, contradictory, over-broad, or misleading judgment(s) on 1 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 1 page(s):
    - `docs/rules/service-method-effect-fn.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-11`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `service-method-effect-fn` — `What it does`: Replace the opening with: “Reports qualifying syntactically exported variables/functions, plus recursively found methods and object properties in any class whose source contains `Context.Service`; class members are checked without an accessibility filter. A value is allowed when its subtree contains a recognized `Effect.fn` call whose first argument is a string literal, or any recognized `Effect.gen` call.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/service-method-effect-fn.md` and `internal/rules/service_method_effect_fn/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/service-method-effect-fn.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 1 page(s) and 1 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-09` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-09`'s explicit reply naming `DOC-11`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed the exact adjudicated `What it does` correction appears once, passed/rejected material is preserved, and the page contract remains valid.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-12: Apply adjudicated material source-fidelity corrections for unused-field

- Status: Done
- Owner: rule-docs-material-corrector-10
- Completion event: Material-corrector reply received and reviewed.
- Reopen reason: Independent adjudication confirmed 1 materially false, contradictory, over-broad, or misleading judgment(s) on 1 page(s) in this group. Rejected third-report findings do not reopen work.
- Preparation check: Ready gate passed on 2026-08-26. The task, outcome, exact correction text, inputs, fresh owner, writable disjoint paths, tools, next action, and completion event are explicit. No dependency remains.
- Task: Apply only the verbatim adjudicated corrections below to the named axes. Do not change passed axes, rejected findings, unaffected pages, catalog files, rule sources, fixtures, tests, project records, or either evidence report.
- Outcome: The named sections stop making the confirmed material misstatements while every unaffected section remains unchanged.
- Definition of done:
  - [ ] Apply every verbatim correction below to its named axis only.
  - [ ] Change only these 1 page(s):
    - `docs/rules/unused-field.md`
  - [ ] Preserve the shared page contract.
  - [ ] Reply with `DOC-12`, every corrected slug and axis, the applied correction, and confirmation that no other file changed.
- Correction scope (verbatim from `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`):
  - `unused-field` — `What it does`: Replace the read claim with: “Reports a field when its checker symbol has no non-declaration identifier use; writes count as uses. The exact forwarding shape `{ field: value.field }` does not count, while a textual `Struct.get("field")` call counts that field name program-wide.”
- Inputs:
  - `AGENTS.md`
  - Shared page contract in this record
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - `docs/rules/unused-field.md` and `internal/rules/unused_field/`
- Dependencies: None. Independent adjudication is complete and the listed paths are disjoint from all other Ready tasks.
- Next action: Edit `docs/rules/unused-field.md` only at its listed axis using the verbatim correction above, then continue through this task's remaining listed axes only.
- Due: None stated
- Priority: P0 material-correction critical path. `DOC-14` and `DOC-15` wait for all ten material-correction tasks.
- Effort: Correct 1 page(s) and 1 axis judgment(s); self-check only the listed changes and shared page contract.
- Scheduled: Material corrective wave. Launch concurrently with the other nine Ready correction tasks; reserve one fresh corrector slot.
- Capability routing: Precise Markdown correction from adjudicated source-fidelity evidence.
- Delegation: Fresh owner `rule-docs-material-corrector-10` owns only this task's disjoint page paths.
- Completion event: Receive `rule-docs-material-corrector-10`'s explicit reply naming `DOC-12`, every corrected slug and axis, each applied correction, and confirmation that no other file changed; then review the diff against the verbatim correction scope and shared page contract.
- Review or follow-up: Move to Done only after the completion event and review pass. Otherwise return to Ready with the exact remaining correction.
- Evidence: Preserve both `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as historical failure and adjudication evidence. Parent review confirmed the exact adjudicated symbol-use correction is present, including write/forwarding/Struct.get behavior; all other material and the page contract are preserved.
- Tags: `rule-docs`, `page-group`, `material-correction`

### DOC-13: Integrate rule pages into the published catalog

- Status: Done
- Owner: rule-docs-catalog-integrator
- Completion event: Worker reply received and reviewed.
- Preparation check: Ready gate passed: `AGENTS.md`, `docs/rules.md`, and `docs/.vitepress/config.mts` are readable; `docs/rules.md` has 131 unique sorted code-form slug bullets; the page targets are fixed by `DOC-01` through `DOC-12`; the repository and `docs/` are writable.
- Task: Link every published catalog entry to its matching rule page and keep site navigation valid.
- Outcome: A reader can reach every rule page from `docs/rules.md` without a broken route.
- Definition of done:
  - [ ] All 131 bullets in `docs/rules.md` are links to their matching `docs/rules/<slug>.md` routes.
  - [ ] Link labels preserve the exact slug text, order, uniqueness, and count.
  - [ ] `docs/.vitepress/config.mts` is changed only if required for valid rule navigation; existing top-level navigation remains intact.
  - [ ] No rule page content is changed by this task.
- Inputs:
  - `AGENTS.md`
  - `docs/rules.md`
  - `docs/.vitepress/config.mts`
  - Assigned page paths in `DOC-01` through `DOC-12`
- Dependencies: None. Verified cleared.
- Next action: Edit `docs/rules.md` so each of its 131 code-form slug bullets links to `./rules/<slug>.md`.
- Due: None stated
- Priority: P0 critical path: the linked catalog is required for navigation and blocks complete site validation.
- Effort: Small: convert 131 catalog bullets to matching links and verify exact count, order, labels, and targets; reserve one fresh integrator slot.
- Scheduled: Initial wave: launch immediately and concurrently with `DOC-01` through `DOC-12`; hold one integrator slot until its explicit reply.
- Capability routing: Mechanical Markdown catalog integration and navigation integrity checks without editing rule pages.
- Delegation: One fresh `rule-docs-catalog-integrator` subagent owns only `DOC-13` and the shared catalog or required site-navigation files. The project orchestrator combines it with page results.
- Completion event: Receipt of the integrator’s explicit completion reply with the catalog diff and count/order/target evidence. The orchestrator then inspects shared files and routes review.
- Review or follow-up: None; no waiting condition.
- Evidence: Parent review confirmed 131 links, 131 unique exact labels, sorted order, exact label-to-target equality, original catalog equality, and no site-config change.
- Tags: `rule-docs`, `integration`

### DOC-14: Validate source fidelity for every rule page

- Status: Done
- Owner: rule-docs-source-validator
- Completion event: Material-final validator reply and evidence report received and reviewed.
- Preparation check: Ready gate passed on 2026-08-26 after parent review confirmed all 25 material corrections and all `DOC-01` through `DOC-13` became Done. The owner, inputs, tools, environment, destination, constraints, and next action are available now.
- Task: Run a fresh independent 131-page, four-axis material-fidelity review against the final candidate.
- Outcome: Every final page is concise and materially source-accurate under the authoritative request and Shared page contract.
- Final-review standard: Inspect all 131 pages. Fail a judgment only for a materially false, contradictory, over-broad, or misleading claim, a wrong example, or an omitted important tested limit that makes the guidance misleading. Do not fail a concise page merely for omitting incidental implementation details. Treat all 66 REJECTED findings in `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` as fixed constraints unless a page change introduced a new contradiction.
- Definition of done:
  - [ ] Confirm all `DOC-01` through `DOC-13` remain Done.
  - [ ] Run a fresh clean-context review of all 131 pages against every corresponding production implementation file, test, and fixture.
  - [ ] Apply the final-review standard and the adjudication's 66 REJECTED findings as fixed constraints unless a page change introduced a new contradiction.
  - [ ] Write `.scratch/rule-documentation/evidence/source-fidelity-final.md` with exactly 131 unique rows and separate judgments for `What it does`, `When to use it`, Conformant, and Non-conformant.
  - [ ] Record zero missing rows, zero duplicate rows, and zero failures under the final-review standard.
  - [ ] Preserve `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md` unchanged as the third-report and adjudication evidence.
  - [ ] Route any final failure only to its affected page-group task with exact slug, axis, material reason, and correction.
- Inputs:
  - Final candidate results from `DOC-01` through `DOC-13`
  - `docs/rules.md` and all 131 `docs/rules/*.md` pages
  - All corresponding production implementation files, tests, and fixtures under `internal/rules/`
  - `.scratch/rule-documentation/evidence/source-fidelity.md`
  - `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`
  - Writable destination `.scratch/rule-documentation/evidence/source-fidelity-final.md`
- Dependencies: None. All `DOC-01` through `DOC-13` are Done and parent-reviewed.
- Next action: Launch a fresh clean-context `rule-docs-source-validator` to inspect all 131 pages and write `.scratch/rule-documentation/evidence/source-fidelity-final.md` under the final-review standard.
- Due: None stated
- Priority: P0 required final acceptance gate.
- Effort: Very large: independently review 131 pages on four axes.
- Scheduled: Final validation wave; launch concurrently with `DOC-15` now.
- Capability routing: Independent Go rule semantics, fixture review, TypeScript example verification, material-fidelity judgment, and exact matrix accounting.
- Delegation: Use a fresh clean-context execution under accountable owner `rule-docs-source-validator`; it owns only final validation and `.scratch/rule-documentation/evidence/source-fidelity-final.md`.
- Completion event: Receive and review the fresh final report; accept only exactly 131 unique rows, four axes per row, zero missing rows, zero duplicate rows, and zero material failures under the final-review standard.
- Review or follow-up: Launch now. Review when the owner replies and the final evidence file exists.
- Evidence: Preserve `.scratch/rule-documentation/evidence/source-fidelity.md` and `.scratch/rule-documentation/evidence/source-fidelity-adjudication.md`. The first records all 91 third-report findings. The second records 25 CONFIRMED judgments on 21 pages and 66 REJECTED judgments. Write final evidence only to `.scratch/rule-documentation/evidence/source-fidelity-final.md`.
- Material-final review evidence: Reviewed `.scratch/rule-documentation/evidence/source-fidelity-final.md`: exactly 131 unique rows and 524/524 PASS judgments under the recorded material-fidelity standard, zero missing/duplicate/material failures, with prior reports preserved.
- Tags: `rule-docs`, `validation`, `source-fidelity`

### DOC-15: Validate the complete published documentation

- Status: Done
- Owner: rule-docs-site-validator
- Completion event: Material-final validator reply and evidence report received and reviewed.
- Preparation check: Ready gate passed on 2026-08-26 after parent review confirmed all final page edits and all `DOC-01` through `DOC-13` became Done. The owner, inputs, tools, environment, append destination, and next action are available now.
- Reopen reason: The latest PASS predates the 21 final page edits required by independent adjudication. It remains historical evidence and cannot satisfy final acceptance.
- Task: Rerun the complete catalog, page structure, links, site build, repository checks, diff checks, and scope checks against the final candidate.
- Outcome: The final corrected documentation is complete, navigable, buildable, and safe to publish.
- Definition of done:
  - [ ] Confirm all `DOC-01` through `DOC-13` remain Done.
  - [ ] Run a fresh full deterministic validation after the final edits.
  - [ ] Append exact fresh commands and results to `.scratch/rule-documentation/evidence/site-validation.md` without deleting historical evidence.
  - [ ] Prove equality among the 131 catalog slugs, normalized rule package names, catalog link targets, and page names.
  - [ ] Prove every page has the required title, four required headings once and in order, and fenced `ts` examples under both code sections.
  - [ ] Report no broken catalog or VitePress route.
  - [ ] `bun run docs:build`, `./scripts/check.sh`, and `git diff --check` pass.
  - [ ] Confirm the diff stays within allowed documentation and project-record scope.
- Inputs:
  - Final candidate results from `DOC-01` through `DOC-13`
  - `AGENTS.md`, `docs/rules.md`, all 131 `docs/rules/*.md` pages, `docs/.vitepress/config.mts`, `internal/rules/`, `package.json`, and `scripts/check.sh`
  - Readable and writable append destination `.scratch/rule-documentation/evidence/site-validation.md`
- Dependencies: None. All `DOC-01` through `DOC-13` are Done and parent-reviewed.
- Next action: Launch a fresh clean-context `rule-docs-site-validator` to rerun every complete-site and repository check and append exact final evidence to `.scratch/rule-documentation/evidence/site-validation.md`.
- Due: None stated
- Priority: P0 final publication gate.
- Effort: Medium with slow commands.
- Scheduled: Final validation wave; launch concurrently with `DOC-14` now.
- Capability routing: Independent repository validation with Git, Bun/VitePress, shell scripting, `mise`, and Go.
- Delegation: Use a fresh clean-context execution under accountable owner `rule-docs-site-validator`; it owns only this validation and its evidence append.
- Completion event: Receive and review a fresh complete passing rerun appended after the final edits, including every required deterministic, build, repository, diff, and scope check.
- Review or follow-up: Launch now. Review when the owner replies and the appended final evidence exists.
- Evidence: Preserve the historical PASS in `.scratch/rule-documentation/evidence/site-validation.md`; append the final rerun after the edits.
- Material-final review evidence: Reviewed the appended material-final section in `.scratch/rule-documentation/evidence/site-validation.md`; every catalog, page, route, build, repository, diff, and scope check passed, and only the evidence report changed.
- Tags: `rule-docs`, `validation`, `site`

## Final project review

- Verdict: Passed
- Corrective action: None
- Evidence: 131 exact catalog/page/package targets; 524/524 material-fidelity judgments passed; final VitePress, rendered-route, `./scripts/check.sh`, `git diff --check`, and scope checks passed.

## Coordination notes

- Project summary: 15 Done, 0 Ready, 0 In progress, 0 Blocked.
- Current step: `report-project-result` complete.
- Next action: None.
- Completion event: Independent project review passed with no corrective action.
- `DOC-14` preserves both prior source-fidelity reports and writes `.scratch/rule-documentation/evidence/source-fidelity-final.md`.
- `DOC-15` preserves its historical PASS and appends to `.scratch/rule-documentation/evidence/site-validation.md`.
