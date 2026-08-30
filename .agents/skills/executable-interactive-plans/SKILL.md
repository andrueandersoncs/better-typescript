---
name: executable-interactive-plans
description: "Design, approve, implement, and verify browser-based executable interactive plans that produce a runnable web app or HTML page and conforming implementation. Use when a user asks to turn a user story, feature request, intended behavior, or equivalent plan into an executable interactive plan."
compatibility: Requires concurrent fresh-subagent delegation and access to a browser for hands-on testing.
---

# Executable Interactive Plans

Design and deliver the approved executable interactive plan as a browser-based web app or HTML page, plus its conforming implementation, through the full workflow in [references/executable-interactive-plans.md](references/executable-interactive-plans.md), while keeping private implementation design outside the frozen behavioral contract.

Run every task once in a new, fresh subagent; the invoking agent owns the workflow, binds declared values, launches all ready tasks concurrently, immediately launches newly ready work, and passes each subagent the full rendered task. Mark unavailable work blocked with its unmet condition and resuming event or time, and do not launch its dependents; start asynchronous work once, then persist outputs, evidence, decisions, handles, output locations, completion events, and the next action at a declared durable checkpoint before resuming on the recorded event or time. End with an independent review and a final report that waits for its verdict; a failed review returns one corrective action and leaves the workflow incomplete, while only a passed review permits completion.

## Inputs

- **intended-behavior:** A user story, feature request, intended behavior, or equivalent plan in any workable form; it may be partial or informal.
- **active-repository:** The repository to change, including its discoverable instructions, existing artifacts, database dialect, and applicable commands; the user does not need to enumerate them.
- **artifact-destination:** An optional requested location for the interactive plan and its durable result; otherwise discover and declare a repository-appropriate location.
- **available-behavior-context:** Any useful schemas, domain types, errors, Effects, service contracts, repositories, queries, migrations, fixtures, or acceptance observations, in any available combination or order.

## Outputs

- **executable-interactive-plan-result:** The approved executable interactive plan itself at its browser-openable URL or HTML entry path. It is complete only when hands-on browser testing confirms the page matches the intended behavior and human approval, implementation, applicable repository and conformance checks, and a fresh independent final review all pass.

## Tasks

### discover-plan-context: Discover the plan context

Discover the story boundary, repository rules and commands, canonical artifacts, participating boundaries, database dialect, and browser app and evidence locations from $intended-behavior, $active-repository, $artifact-destination, and $available-behavior-context; honor a supplied valid destination or discover appropriate locations, declare a durable checkpoint root, and complete when every needed fact has an authoritative source or discovery result. If a required fact or dependency remains unavailable, persist the checkpoint, return one concrete unblock action, and produce no output.

**Inputs:**

- Use workflow input intended-behavior.
- Use workflow input active-repository.
- Use workflow input artifact-destination.
- Use workflow input available-behavior-context.

**Constraints:**

- Treat repository instructions and canonical artifacts as authoritative.
- Repository context is complete only when every needed fact has an authoritative source or discovery result.

**Outputs:**

- repository-plan-context: The story boundary, repository facts, participating capabilities, applicable commands, declared browser app and evidence locations, and durable checkpoint root.

### build-and-exercise-plan: Build and exercise the executable plan

Use $repository-plan-context and the detailed design guidance in [references/executable-interactive-plans.md](references/executable-interactive-plans.md) to build the typed interactive diagram and closed Effect simulation as a browser-based web app or HTML page, open it in a real browser, manually interact with every representative path, compare visible behavior with the intended behavior, record observations, fix mismatches, and repeat the browser test until the declared location contains the coherent runnable page with durable evidence.

**Inputs:**

- Wait for discover-plan-context to produce repository-plan-context.

**Constraints:**

- Follow the reference's artifact, simulation, deterministic-boundary, persistence, repository-reuse, and evidence requirements.
- Add only the smallest missing behavioral schema, service contract, fixture, or seam.
- Advance only when hands-on browser testing confirms every representative path, observation, and invariant.

**Outputs:**

- runnable-plan-candidate: The browser-based web app or HTML page running the interactive plan at its declared location.
- plan-exploration-evidence: The persisted hands-on browser test steps, representative scenario inputs, visible observations, revisions, and replay results.

### approve-behavioral-contract: Approve and freeze observable behavior

Use $repository-plan-context to persist review checkpoints at its declared checkpoint root, and present $runnable-plan-candidate in a browser with $plan-exploration-evidence for human review using [references/executable-interactive-plans.md](references/executable-interactive-plans.md); when review changes observable behavior, revise the plan, repeat hands-on browser testing, replay affected scenarios, and request approval again. If approval is withheld or pending, persist the checkpoint, return one concrete next action, and produce no output; complete only by persisting approval of the final behavior and one canonical scenario set.

**Inputs:**

- Wait for discover-plan-context to produce repository-plan-context.
- Wait for build-and-exercise-plan to produce runnable-plan-candidate.
- Wait for build-and-exercise-plan to produce plan-exploration-evidence.

**Constraints:**

- Approved observable behavior is immutable during implementation; private implementation design remains outside the contract.

**Outputs:**

- approved-runnable-plan: The final browser-based web app or HTML page whose observable behavior received human approval.
- human-approval-record: The durable approval record containing the frozen behavioral interfaces and canonical scenario inputs and expected observations.

### implement-approved-contract: Implement behind the approved interfaces

Use $repository-plan-context, $approved-runnable-plan, and $human-approval-record to delegate and complete the repository implementation behind the frozen interfaces. If implementation is blocked or running, persist its state, return one concrete next action, and produce no output; if it requires observable behavior to change, end the current run incomplete, produce no output, and return one concrete action to start a new plan-revision-and-approval run from the changed requirement.

**Inputs:**

- Wait for discover-plan-context to produce repository-plan-context.
- Wait for approve-behavioral-contract to produce approved-runnable-plan.
- Wait for approve-behavioral-contract to produce human-approval-record.

**Constraints:**

- Preserve the frozen observable interfaces while allowing private implementation structure to evolve.
- Complete only when the implementation is available through its public seams.

**Outputs:**

- implemented-system: The repository implementation behind the approved public seams.

### verify-implementation-conformance: Verify and correct implementation conformance

Use $human-approval-record to run its canonical scenarios through adapters for $approved-runnable-plan and $implemented-system, and use $repository-plan-context plus [references/executable-interactive-plans.md](references/executable-interactive-plans.md) to run applicable repository checks. Correct implementation-only defects and rerun all checks; if conformance requires observable behavior to change, end the current run incomplete, produce no output, and return one concrete action to start a new plan-revision-and-approval run from the changed requirement, while any other unresolved failure returns one corrective action and no output.

**Inputs:**

- Wait for approve-behavioral-contract to produce human-approval-record.
- Wait for approve-behavioral-contract to produce approved-runnable-plan.
- Wait for implement-approved-contract to produce implemented-system.
- Wait for discover-plan-context to produce repository-plan-context.

**Constraints:**

- One canonical scenario set must drive both diagram and implementation adapters.
- Implementation-only corrections must preserve approved observable behavior.
- Complete only when both adapters match and applicable unit, property, integration, and end-to-end checks pass with durable evidence.

**Outputs:**

- conformant-implementation: The corrected implementation that passes the approved scenarios and applicable repository checks.
- implementation-conformance-evidence: The persisted adapter comparisons and repository check results proving conformance.

### review-delivered-result: Independently review the delivered result

In a fresh independent review, open $approved-runnable-plan in a real browser, manually repeat every canonical scenario in $human-approval-record, and compare its visible states, results, errors, database observations, external calls, and invariants with $intended-behavior, $repository-plan-context, $conformant-implementation, and $implementation-conformance-evidence in their actual destinations; record a supported pass only when the hands-on browser test matches the approved plan and every completion condition, otherwise record a fail with one concrete corrective action.

**Inputs:**

- Use workflow input intended-behavior.
- Wait for discover-plan-context to produce repository-plan-context.
- Wait for approve-behavioral-contract to produce approved-runnable-plan.
- Wait for approve-behavioral-contract to produce human-approval-record.
- Wait for verify-implementation-conformance to produce conformant-implementation.
- Wait for verify-implementation-conformance to produce implementation-conformance-evidence.

**Constraints:**

- The canonical scenarios in the human approval record are the authoritative manual test set.

**Outputs:**

- independent-review-verdict: The independent pass verdict with hands-on browser test findings, or fail verdict with one concrete corrective action.

### report-executable-plan-result: Report the reviewed workflow result

Use $repository-plan-context and $independent-review-verdict to return $approved-runnable-plan at its browser-openable URL or HTML entry path, and separately report the actual locations of $human-approval-record, $conformant-implementation, and $implementation-conformance-evidence. A fail reports its corrective action, returns no workflow output, and leaves the workflow incomplete; only a pass returns the browser app itself as the durable final result.

**Inputs:**

- Wait for discover-plan-context to produce repository-plan-context.
- Wait for review-delivered-result to produce independent-review-verdict.
- Wait for approve-behavioral-contract to produce approved-runnable-plan.
- Wait for approve-behavioral-contract to produce human-approval-record.
- Wait for verify-implementation-conformance to produce conformant-implementation.
- Wait for verify-implementation-conformance to produce implementation-conformance-evidence.

**Constraints:**

- The workflow output is the browser app itself at its browser-openable URL or HTML entry path.

**Outputs:**

- executable-interactive-plan-result: The approved executable interactive plan itself at its browser-openable URL or HTML entry path.
