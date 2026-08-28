---
name: mine-repository-ideas
description: "Mine an external repository for evidence-backed Better TypeScript lint rule candidates and other reusable ideas in one Markdown report. Use when asked to inspect a repository URL, clone URL, or local checkout for ideas Better TypeScript could adopt."
compatibility: Requires concurrent fresh-subagent delegation.
---

# Mine Repository Ideas

Mine one external repository for evidence-backed Better TypeScript rule candidates and other reusable ideas, and produce exactly one Markdown report without implementing ideas or editing the source repository.

Every task runs once in a fresh subagent. The owner launches all ready tasks concurrently, passes each full rendered task, persists outputs, evidence, decisions, handles, and next actions in the runtime session checkpoint outside both repositories, starts asynchronous work once and resumes only on its completion event, treats only `Wait` as a dependency, records the resume event for blocked work, stops downstream work for a blocking question or unresolved failure, and claims completion only after a passed fresh independent review; checkpoint state is not a repository artifact or workflow output.

## Inputs

- **repository-source:** Optional URL, clone URL, local checkout, or local checkout with canonical forge URL; default `https://github.com/Effect-TS/effect/tree/main`.
- **source-revision:** Optional resolvable branch, tag, or SHA.
- **research-focus:** Optional priority topics, areas, or outcomes.
- **research-exclusions:** Optional omissions.
- **research-depth:** Optional effort or detail guidance.
- **research-context:** Optional background, constraints, known overlap, or goals.
- **report-destination:** Optional repo-relative Markdown path; default `.scratch/research/<sanitized-repo-name>-ideas.md`.

## Outputs

- **repository-ideas-report:** Exactly one Markdown report that names the source, canonical URL, exact SHA, and coverage; orders Recommended lint rules before Other ideas; and gives every suggestion its recommendation, applicability, reasoning, novelty or overlap, direct and preferably commit-pinned example links, Observed evidence, and Inference. A no-findings report is valid. Completion requires every task check and a passed fresh independent review.

## Tasks

### resolve-repository-source: Resolve the external repository

Normalize optional $repository-source, defaulting to `https://github.com/Effect-TS/effect/tree/main`, at optional $source-revision using $better-typescript-repository into a read-only checkout outside Better TypeScript, an exact SHA, repository name, and canonical link base, then verify the checkout and revision; for a local checkout without a canonical link, return exactly one question and no resolved record.

**Inputs:**

- Use workflow input repository-source.
- Use workflow input source-revision.
- Use runtime value better-typescript-repository.

**Constraints:**

- Default an omitted source to `https://github.com/Effect-TS/effect/tree/main`.
- Keep the external source repository unchanged.
- A canonical-source question blocks every source-dependent task.
- An unresolvable source or revision is an unresolved failure.

**Outputs:**

- resolved-source-record: Verified read-only checkout path, exact SHA, repository name, canonical URL, and commit-pinned link base.
- canonical-source-question: Exactly one blocking question for a local checkout without a canonical link, otherwise an empty value.

### inventory-better-typescript: Inventory current Better TypeScript coverage

In $better-typescript-repository, read every current package under `internal/rules/`, `internal/rules/catalog.go`, `docs/rules.md`, every entry under `docs/rules/`, and `skills/better-typescript/SKILL.md`; record the complete overlap inventory and capture the current branch and file-level workspace baseline, then verify every required location was inspected.

**Inputs:**

- Use runtime value better-typescript-repository.

**Constraints:**

- Treat the working tree as read-only.
- Preserve pre-existing changes in the baseline.

**Outputs:**

- better-typescript-overlap-inventory: Complete current rule and documented-coverage inventory with inspected paths.
- better-typescript-workspace-baseline: Current branch and file-level workspace state before report writing.

### scan-lint-rule-ideas: Scan for lint rule candidates

Inspect $resolved-source-record using $research-focus, $research-exclusions, $research-depth, and $research-context for concrete source patterns with broader utility and plausible `typescript-go` AST or checker detection; return linked evidence, separate Observed evidence from Inference, coverage, and a verified result that may be empty.

**Inputs:**

- Wait for resolve-repository-source to produce resolved-source-record.
- Use workflow input research-focus.
- Use workflow input research-exclusions.
- Use workflow input research-depth.
- Use workflow input research-context.

**Constraints:**

- Prefer direct commit-pinned source links.
- Keep only candidates grounded in inspected source patterns.
- Do not edit either repository.

**Outputs:**

- lint-rule-scan-record: Candidate lint rules, linked evidence, Observed evidence, Inference, coverage, and scan completion check.

### scan-other-ideas: Scan for other reusable ideas

Inspect $resolved-source-record using $research-focus, $research-exclusions, $research-depth, and $research-context for reusable non-rule ideas; return linked evidence, separate Observed evidence from Inference, coverage, and a verified result that may be empty.

**Inputs:**

- Wait for resolve-repository-source to produce resolved-source-record.
- Use workflow input research-focus.
- Use workflow input research-exclusions.
- Use workflow input research-depth.
- Use workflow input research-context.

**Constraints:**

- Prefer direct commit-pinned source links.
- Keep rule-shaped findings in the lint-rule scan.
- Do not edit either repository.

**Outputs:**

- other-ideas-scan-record: Other reusable ideas, linked evidence, Observed evidence, Inference, coverage, and scan completion check.

### adjudicate-repository-ideas: Adjudicate all candidates

Adjudicate $lint-rule-scan-record and $other-ideas-scan-record against $better-typescript-overlap-inventory and $resolved-source-record, guided by $research-focus, $research-exclusions, $research-depth, and $research-context; deduplicate findings, verify links and evidence, assess novelty and overlap, move non-rules, accept only credible suggestions without a quota, and verify every accepted item meets the report contract.

**Inputs:**

- Wait for scan-lint-rule-ideas to produce lint-rule-scan-record.
- Wait for scan-other-ideas to produce other-ideas-scan-record.
- Wait for inventory-better-typescript to produce better-typescript-overlap-inventory.
- Wait for resolve-repository-source to produce resolved-source-record.
- Use workflow input research-focus.
- Use workflow input research-exclusions.
- Use workflow input research-depth.
- Use workflow input research-context.

**Constraints:**

- Keep no quota for accepted findings.
- Preserve a valid no-findings outcome.
- Classify plausible lint rules before other ideas.

**Outputs:**

- adjudicated-idea-set: Deduplicated accepted lint rules and other ideas, verified evidence and links, overlap decisions, coverage, reclassifications, and acceptance checks.

### write-repository-ideas-report: Write the single report

Write or idempotently refresh $report-destination inside $better-typescript-repository from $adjudicated-idea-set and $resolved-source-record while checking $better-typescript-workspace-baseline; verify the actual destination contains the required ordered sections and fields and that it is the only written artifact.

**Inputs:**

- Wait for adjudicate-repository-ideas to produce adjudicated-idea-set.
- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for inventory-better-typescript to produce better-typescript-workspace-baseline.
- Use workflow input report-destination.
- Use runtime value better-typescript-repository.

**Constraints:**

- Resolve an omitted destination to `.scratch/research/<sanitized-repo-name>-ideas.md`.
- Write exactly one Markdown report and no support files.
- Preserve every unrelated workspace change.
- Name the source, canonical URL, exact SHA, and coverage.
- Put Recommended lint rules before Other ideas.
- Give every suggestion recommendation, applicability, reasoning, novelty or overlap, direct and preferably commit-pinned example links, Observed evidence, and Inference.

**Outputs:**

- written-report-record: Actual report path, content hash, source revision, artifact-diff check, and contract check.

### review-repository-ideas-report: Review the actual report independently

Independently inspect the actual $written-report-record, source examples from $resolved-source-record, $better-typescript-overlap-inventory, and $better-typescript-workspace-baseline; return a verified pass or fail, evidence, and exactly one concrete corrective action on failure.

**Inputs:**

- Wait for write-repository-ideas-report to produce written-report-record.
- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for inventory-better-typescript to produce better-typescript-overlap-inventory.
- Wait for inventory-better-typescript to produce better-typescript-workspace-baseline.

**Constraints:**

- Check the report in its actual destination.
- Check source accuracy, report completeness, ordering, link quality, overlap, coverage, one-artifact scope, and preservation of baseline changes.
- Return no corrective action on pass and exactly one on failure.

**Outputs:**

- initial-independent-review: Pass or fail verdict, review evidence, and exactly one corrective action on failure.

### correct-or-forward-report: Apply the first review decision

Use $initial-independent-review on $written-report-record; on pass, forward the report byte-identically, and on failure, apply only its one corrective action to the report, then verify the resulting path, bytes or correction, and artifact scope.

**Inputs:**

- Wait for review-repository-ideas-report to produce initial-independent-review.
- Wait for write-repository-ideas-report to produce written-report-record.

**Constraints:**

- Change only the report and only when the review fails.
- Apply exactly the single requested correction on failure.
- Preserve report bytes exactly on pass.

**Outputs:**

- review-ready-report: Actual report path, final content hash, pass-forward or correction record, and artifact-scope check.

### final-independent-review: Review the final report independently

Independently inspect the actual destination in $review-ready-report against $resolved-source-record, $lint-rule-scan-record, $other-ideas-scan-record, $better-typescript-overlap-inventory, $better-typescript-workspace-baseline, $adjudicated-idea-set, and $initial-independent-review; verify the final report and all evidence, then return pass or fail with evidence and exactly one concrete correction on failure.

**Inputs:**

- Wait for correct-or-forward-report to produce review-ready-report.
- Wait for resolve-repository-source to produce resolved-source-record.
- Wait for scan-lint-rule-ideas to produce lint-rule-scan-record.
- Wait for scan-other-ideas to produce other-ideas-scan-record.
- Wait for inventory-better-typescript to produce better-typescript-overlap-inventory.
- Wait for inventory-better-typescript to produce better-typescript-workspace-baseline.
- Wait for adjudicate-repository-ideas to produce adjudicated-idea-set.
- Wait for review-repository-ideas-report to produce initial-independent-review.

**Constraints:**

- Inspect the report at its actual final path.
- Check every report contract term, source claim, link, overlap decision, coverage statement, artifact boundary, and preserved baseline change.
- Return no correction on pass and exactly one correction on failure.

**Outputs:**

- final-independent-review-verdict: Pass or fail verdict, result path, exact source SHA, completion evidence, and exactly one correction on failure.

### report-workflow-result: Report the workflow result

Report $final-independent-review-verdict with exactly `Result path`, `Source revision`, `Completion state`, and `Evidence`; on failure also report `Corrective action`, leave the workflow incomplete, and make no completion claim.

**Inputs:**

- Wait for final-independent-review to produce final-independent-review-verdict.

**Constraints:**

- Claim completion only for a passed final independent review.
- A failed review ends this run without a retry loop.

**Outputs:**

- workflow-result-report: The exact result fields, with corrective action added only for an incomplete result.
