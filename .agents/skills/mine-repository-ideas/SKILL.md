---
name: mine-repository-ideas
description: "Incrementally mine an external repository for evidence-backed Better TypeScript ideas in one Markdown report while preserving human ACCEPT and DENY decisions. Use when asked to inspect a repository URL, clone URL, or local checkout for ideas Better TypeScript could adopt."
compatibility: Requires concurrent fresh-subagent delegation.
---

# Mine Repository Ideas

Incrementally mine one external repository for evidence-backed Better TypeScript rule candidates and other reusable ideas, and produce exactly one Markdown report without implementing ideas or editing the source repository.

Every task runs once in a fresh subagent. The owner launches all ready tasks concurrently, passes each full rendered task, persists outputs, evidence, decisions, handles, and next actions in the runtime session checkpoint outside both repositories, starts asynchronous work once and resumes only on its completion event, treats only `Wait` as a dependency, records the resume event for blocked work, stops downstream work for a blocking question or unresolved failure, and claims completion only after a passed fresh independent review; checkpoint state is not a repository artifact or workflow output.

Use [references/research-state-protocol.md](references/research-state-protocol.md) as the global research-state-protocol.

## Inputs

- **repository-source:** Optional URL, clone URL, local checkout, or local checkout with canonical forge URL; default `https://github.com/Effect-TS/effect/tree/main`.
- **source-revision:** Optional resolvable branch, tag, or SHA.
- **research-focus:** Optional priority topics, areas, or outcomes.
- **research-exclusions:** Optional omissions.
- **research-depth:** Optional effort or detail guidance.
- **research-context:** Optional background, constraints, known overlap, or goals.
- **report-destination:** Optional repo-relative Markdown path; default `.scratch/research/<sanitized-repo-name>-ideas.md`.

## Outputs

- **repository-ideas-report:** Exactly one cumulative Markdown report at the requested repo-relative report destination, or `.scratch/research/<sanitized-repo-name>-ideas.md` by default. It names the exact source and coverage, preserves human annotations, contains the deterministic Research ledger, and includes evidence-backed current recommendations. A no-findings report is valid. Completion requires every task check and a passed fresh independent review.

## Tasks

### resolve-repository-source: Resolve the external repository

Normalize optional $repository-source, defaulting to `https://github.com/Effect-TS/effect/tree/main`, at optional $source-revision using $better-typescript-repository into a read-only checkout outside Better TypeScript, an exact SHA, verified commit tree ID, repository name, canonical URL, and commit-pinned link base, then verify the checkout and revision; for a local checkout without a canonical link, return exactly one question and no resolved record.

**Inputs:**

- Use workflow input repository-source.
- Use workflow input source-revision.
- Use runtime value better-typescript-repository.

**Constraints:**

- Keep the fixed Effect source as the default.
- Keep the external source repository unchanged.
- A canonical-source question blocks every source-dependent task.
- An unresolvable source or revision is an unresolved failure.

**Outputs:**

- resolved-source-record: Verified read-only checkout path, exact SHA, verified commit tree ID, repository name, canonical URL, and commit-pinned link base.
- canonical-source-question: Exactly one blocking question for a local checkout without a canonical link, otherwise an empty value.

### inventory-better-typescript: Inventory current Better TypeScript coverage

Apply $research-state-protocol in $better-typescript-repository to read the declared Better TypeScript overlap corpus, record its complete rule and documentation inventory plus the current branch and file-level workspace baseline, compute the Better TypeScript fingerprint and method fingerprint, and verify the exact inspected paths.

**Inputs:**

- Use global value research-state-protocol.
- Use runtime value better-typescript-repository.

**Constraints:**

- Treat the working tree as read-only.
- Preserve pre-existing changes in the baseline.
- Cover every path required by the protocol exactly once.

**Outputs:**

- better-typescript-overlap-inventory: Complete current rule and documented-coverage inventory with inspected paths.
- better-typescript-workspace-baseline: Current branch and file-level workspace state before report writing.
- better-typescript-fingerprint: Protocol-encoded Better TypeScript fingerprint, manifest, and inspected-path verification.
- research-method-fingerprint: Protocol-encoded method fingerprint and manifest.

### reconcile-research-history: Reconcile prior research and select incremental work

Apply $research-state-protocol before any source scan: resolve $report-destination in $better-typescript-repository, read the existing report when present, and reconcile it with $resolved-source-record, $better-typescript-fingerprint, $research-method-fingerprint, $research-focus, $research-exclusions, $research-depth, and $research-context; return stable identity and annotation state, scope and state encoding, bounded per-lane directives, migration and adjudication modes, or exactly one blocking question.

**Inputs:**

- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for inventory-better-typescript to produce better-typescript-fingerprint.
- Wait for inventory-better-typescript to produce research-method-fingerprint.
- Use global value research-state-protocol.
- Use workflow input report-destination.
- Use runtime value better-typescript-repository.
- Use workflow input research-focus.
- Use workflow input research-exclusions.
- Use workflow input research-depth.
- Use workflow input research-context.

**Constraints:**

- Reconcile before either scan starts.
- Stop both scans for an annotation ambiguity or conflict.
- Return exact bounded paths, gaps, affected candidate IDs, and reasons for any full lane.

**Outputs:**

- incremental-research-plan: Parsed cumulative history and ledger, stable identity and annotation state, fingerprints and state encoding, per-lane directives and read bounds, candidate exclusions, migration and adjudication modes, and no-new-evidence state.
- research-history-question: Exactly one blocking question for ambiguous or conflicting annotations, otherwise an empty value.

### scan-lint-rule-ideas: Scan for lint rule candidates

Apply $research-state-protocol and only the lint-rule lane directive in $incremental-research-plan to $resolved-source-record; inspect no source content outside its bounds, exclude covered or settled candidates, and return concrete linked source patterns with Observed evidence separate from Inference, or a verified zero-content-read record for `no-source-scan`.

**Inputs:**

- Wait for reconcile-research-history to produce incremental-research-plan.
- Wait for resolve-repository-source to produce resolved-source-record.
- Use global value research-state-protocol.

**Constraints:**

- Prefer direct commit-pinned source links.
- Keep only broadly useful candidates with plausible `typescript-go` AST or checker detection grounded in inspected patterns.
- Keep both repositories unchanged.

**Outputs:**

- lint-rule-scan-record: Applied directive, exact planned and inspected paths, exclusions, new or updated rule candidates with links, Observed evidence and Inference, gaps, completion check, and verified zero-content-read evidence when skipped.

### scan-other-ideas: Scan for other reusable ideas

Apply $research-state-protocol and only the other-ideas lane directive in $incremental-research-plan to $resolved-source-record; inspect no source content outside its bounds, exclude covered or settled candidates, and return linked reusable non-rule ideas with Observed evidence separate from Inference, or a verified zero-content-read record for `no-source-scan`.

**Inputs:**

- Wait for reconcile-research-history to produce incremental-research-plan.
- Wait for resolve-repository-source to produce resolved-source-record.
- Use global value research-state-protocol.

**Constraints:**

- Prefer direct commit-pinned source links.
- Keep rule-shaped findings in the lint-rule scan.
- Keep both repositories unchanged.

**Outputs:**

- other-ideas-scan-record: Applied directive, exact planned and inspected paths, exclusions, new or updated non-rule candidates with links, Observed evidence and Inference, gaps, completion check, and verified zero-content-read evidence when skipped.

### adjudicate-repository-ideas: Adjudicate incremental candidates and cumulative history

Apply $research-state-protocol to merge $lint-rule-scan-record and $other-ideas-scan-record with $incremental-research-plan, assign or match stable candidates, and adjudicate only directed items against $better-typescript-overlap-inventory and $resolved-source-record; verify evidence and links, deduplicate and reclassify findings, apply human annotations, retain cumulative history, and return current recommendations plus ledger updates.

**Inputs:**

- Wait for scan-lint-rule-ideas to produce lint-rule-scan-record.
- Wait for scan-other-ideas to produce other-ideas-scan-record.
- Wait for inventory-better-typescript to produce better-typescript-overlap-inventory.
- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for reconcile-research-history to produce incremental-research-plan.
- Use global value research-state-protocol.

**Constraints:**

- Keep no quota for accepted findings and preserve a valid no-findings outcome.
- Classify plausible lint rules before other ideas.
- Never discard prior research.

**Outputs:**

- adjudicated-idea-set: Current rule and other-idea recommendations, cumulative stable candidate records, annotations and history, verified evidence and links, overlap decisions, coverage, reclassifications, and deterministic ledger updates.

### write-repository-ideas-report: Write or forward the single cumulative report

Apply $research-state-protocol to write, deterministically refresh, or byte-forward $report-destination inside $better-typescript-repository from $adjudicated-idea-set, $resolved-source-record, and $incremental-research-plan while checking $better-typescript-workspace-baseline; verify that the actual destination is the sole runtime repository output and satisfies the complete report state.

**Inputs:**

- Wait for adjudicate-repository-ideas to produce adjudicated-idea-set.
- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for reconcile-research-history to produce incremental-research-plan.
- Wait for inventory-better-typescript to produce better-typescript-workspace-baseline.
- Use global value research-state-protocol.
- Use workflow input report-destination.
- Use runtime value better-typescript-repository.

**Constraints:**

- Resolve an omitted destination to `.scratch/research/<sanitized-repo-name>-ideas.md`.
- Preserve every unrelated workspace change.
- Create no sidecar or support artifact.

**Outputs:**

- written-report-record: Actual report path, pre-write and post-write hashes, source identity, annotation preservation and hash, state key, research mode, artifact diff, byte-identity result, and report contract check.

### review-repository-ideas-report: Review the actual incremental report independently

Apply $research-state-protocol in a fresh independent review of the actual $written-report-record against $resolved-source-record, $better-typescript-overlap-inventory, $better-typescript-workspace-baseline, $incremental-research-plan, $lint-rule-scan-record, $other-ideas-scan-record, and $adjudicated-idea-set; obey the protocol read bounds and verify claims, annotations, ledger state, fingerprints, planned and inspected paths, no-op forwarding, artifact scope, and baseline preservation, then return pass or fail with evidence and exactly one corrective action on failure.

**Inputs:**

- Wait for write-repository-ideas-report to produce written-report-record.
- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for inventory-better-typescript to produce better-typescript-overlap-inventory.
- Wait for inventory-better-typescript to produce better-typescript-workspace-baseline.
- Wait for reconcile-research-history to produce incremental-research-plan.
- Wait for scan-lint-rule-ideas to produce lint-rule-scan-record.
- Wait for scan-other-ideas to produce other-ideas-scan-record.
- Wait for adjudicate-repository-ideas to produce adjudicated-idea-set.
- Use global value research-state-protocol.

**Constraints:**

- Check the report at its actual destination.
- Record exact source paths inspected or revalidated by the review.
- Return no corrective action on pass and exactly one on failure.

**Outputs:**

- initial-independent-review: Pass or fail verdict, bounded review evidence, and exactly one corrective action on failure.

### correct-or-forward-report: Apply the first review decision

Apply $research-state-protocol to $initial-independent-review and $written-report-record; on pass, forward the existing report bytes and hash, and on failure, apply only the one permitted report correction, then verify destination, bytes or correction, annotations, ledger preservation, and artifact scope.

**Inputs:**

- Wait for review-repository-ideas-report to produce initial-independent-review.
- Wait for write-repository-ideas-report to produce written-report-record.
- Use global value research-state-protocol.

**Constraints:**

- Change only the report and only when the review fails.
- Apply exactly the single requested correction on failure.

**Outputs:**

- review-ready-report: Actual report path, final content hash, pass-forward or correction record, annotation preservation check, ledger preservation check, and artifact-scope check.

### final-independent-review: Review the final incremental report independently

Apply $research-state-protocol in a fresh independent review of the actual destination in $review-ready-report against $resolved-source-record, $lint-rule-scan-record, $other-ideas-scan-record, $better-typescript-overlap-inventory, $better-typescript-workspace-baseline, $adjudicated-idea-set, $initial-independent-review, and $incremental-research-plan; obey the protocol read bounds and verify the full incremental trail, report contract, evidence, annotations, ledger state, fingerprints, paths, idempotency, artifact scope, and baseline preservation, then return pass or fail with required evidence and exactly one correction on failure.

**Inputs:**

- Wait for correct-or-forward-report to produce review-ready-report.
- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for scan-lint-rule-ideas to produce lint-rule-scan-record.
- Wait for scan-other-ideas to produce other-ideas-scan-record.
- Wait for inventory-better-typescript to produce better-typescript-overlap-inventory.
- Wait for inventory-better-typescript to produce better-typescript-workspace-baseline.
- Wait for adjudicate-repository-ideas to produce adjudicated-idea-set.
- Wait for review-repository-ideas-report to produce initial-independent-review.
- Wait for reconcile-research-history to produce incremental-research-plan.
- Use global value research-state-protocol.

**Constraints:**

- Inspect the report at its actual final path.
- Record exact source paths inspected or revalidated by the review.
- Return no correction on pass and exactly one correction on failure.

**Outputs:**

- final-independent-review-verdict: Pass or fail verdict, result path, source identity, fingerprints, scope signature, lane directives and paths, annotation count and hash, state key, report hash, artifact diff, completion evidence, and exactly one correction on failure.

### report-workflow-result: Report the workflow result

Report $final-independent-review-verdict with exactly `Result path`, `Source revision`, `Completion state`, and `Evidence`; on failure also report `Corrective action`, leave the workflow incomplete, and make no completion claim.

**Inputs:**

- Wait for final-independent-review to produce final-independent-review-verdict.

**Constraints:**

- Claim completion only for a passed final independent review.
- A failed review ends this run without a retry loop.

**Outputs:**

- workflow-result-report: The exact result fields, with corrective action added only for an incomplete result.
