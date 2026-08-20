---
name: decompose-workflow-skill
description: Decompose a skill into independently useful workflow skills and a behavior-preserving orchestrator. Use when asked to split, extract, modularize, identify reusable workflows, or create agent boundaries in a skill.
compatibility: Requires workflow-to-skill, workflow-callstack-simulation, repository delegation, and fresh-subagent execution for every numbered step.
---

# Decompose Skill

decompose-workflow-skill owns decomposition, approval, orchestration, validation, and reporting. `workflow-to-skill` creates children; `workflow-callstack-simulation` simulates.

Run every numbered procedure step in this skill and the resulting workflow skill in a new, fresh subagent. Give each subagent only its step definition and declared inputs, including required prior-step outputs.

## Inputs

1. **Target skill:** An existing skill in any unambiguous resolvable form, including a repository-relative directory/`SKILL.md`.
2. **Decomposition controls:** Optional focus, names, exclusions, configuration, and boundary preferences in useful form.
3. **Repository context:** Supplied or discovered context.
4. **Decomposition approval:** Explicit approval of the complete current plan before writes, renewable after material changes.

## Outputs

1. **Decomposition result:** The exact Step 12 report, with its required completion gate and exactly one permitted status. The **Decomposition result terminal-packet contract** carries all artifacts available to its producing step, created/changed paths, exact status/condition, and `<Label>: none (<reason>)` for every unavailable Step 12 field.

## Procedure

### 1. Resolve and protect the target baseline.

**Inputs:**

    a. Target skill.
    b. Decomposition controls.
    c. Repository context.
    d. Decomposition approval.
    e. Decomposition result terminal-packet contract.

**Constraints:**

    a. Resolve target/entry point; read complete source, configuration, applicable repository facts/instructions, references, consumers, tests, skill roots, delegation mechanisms, and repository/link/whitespace checks or evidence none are discoverable.
    b. Record contract, manifest/fingerprint, call edges, destinations, and pre-existing changes; confirm both dependencies.
    c. Preserve unrelated/pre-existing changes. If resolution is ambiguous or a dependency unavailable, write nothing and go directly to Step 12.
    d. Completion requires the baseline or terminal packet.

**Outputs:**

    a. Protected analysis baseline containing target/source/configuration, repository facts/instructions, skill roots, delegation/check discovery, entry point, manifest/fingerprint, contract, call edges, destinations, pre-existing changes, controls, dependency readiness, global fresh-subagent policy, and fingerprint-bound approval or `pending`.
    b. `incomplete` baseline-blocker packet under the Decomposition result terminal-packet contract.

### 2. Establish the baseline callstack.

**Inputs:**

    a. Protected analysis baseline.
    b. Decomposition result terminal-packet contract.

**Constraints:**

    a. Reuse `## Callstack Simulation` only when it is the sole final section, current, valid, source-grounded, and branch-complete; otherwise invoke `workflow-callstack-simulation` on the entry/source with compact detail, symbolic missing values, and inline output.
    b. Keep traces as run artifacts; do not edit target. If blocked, write nothing and go directly to Step 12.
    c. Re-read target. On fingerprint drift, preserve unrelated work, discard stale artifacts, output a restart packet carrying all four Step 1 inputs—target, controls, repository context, and approval `invalidated` or `pending`—and route it to Step 1.
    d. Completion requires a current validated `reused`/`generated` callstack, restart packet, or terminal packet.

**Outputs:**

    a. Validated baseline callstack with freshness evidence.
    b. `incomplete` blocker packet under the Decomposition result terminal-packet contract.
    c. Fingerprint-drift restart packet containing all four Step 1 inputs.

### 3. Build the exhaustive candidate ledger.

**Inputs:**

    a. Protected analysis baseline.
    b. Validated baseline callstack with freshness evidence.

**Constraints:**

    a. Map each distinct frame or cohesive subtree that could own a repeatable outcome, including source-specific outcomes.
    b. Record frames, transitions, dependencies, minimum receiver state, and proposed contract once in a non-overlapping ledger.
    c. Merge adjacent frames without a stable independent contract; separate stable branches. Do not treat depth as reuse proof or invent behavior.
    d. Completion requires every baseline frame in exactly one candidate.

**Outputs:**

    a. Exhaustive non-overlapping candidate ledger.

### 4. Apply the independent-use test.

**Inputs:**

    a. Exhaustive non-overlapping candidate ledger.
    b. Protected analysis baseline.

**Constraints:**

    a. For each candidate record trigger, outcome, inputs, outputs, completion evidence, authority boundary, and one credible outside caller.
    b. Select only cohesive, independently useful candidates needing no target-private setup/control state and having a behavior-preserving handoff.
    c. Keep source-only policy/sequencing/checks/fragments and candidates without an outside caller; resolve overlap to the smallest complete useful boundary.
    d. Completion requires evidence-backed provisional `select` or `keep` for each item.

**Outputs:**

    a. Provisionally dispositioned ledger with independent-use evidence.

### 5. Test configuration extraction for kept candidates.

**Inputs:**

    a. Provisionally dispositioned candidate ledger.
    b. Protected analysis baseline.

**Constraints:**

    a. For each kept candidate, test a fixed workflow with bounded declarative source configuration.
    b. Define fields, ownership, validation, and default or required value; test the source and one materially different caller/configuration.
    c. Promote only when workflow/completion remain stable and the other caller independently uses the outcome; otherwise record `not reusable through configuration`, especially when configuration encodes the algorithm/private state.
    d. Completion requires every final disposition, every kept configuration result, and promoted contract.

**Outputs:**

    a. Final dispositioned ledger.
    b. Configuration result for every kept candidate.
    c. Configuration contract for every promoted candidate.

### 6. Place execution boundaries and define handoffs.

**Inputs:**

    a. Final ledger, including minimum receiver state.
    b. Protected analysis baseline.
    c. Configuration results/contracts.

**Constraints:**

    a. Compare same-agent and fresh execution per transition; extraction and placement are independent.
    b. Use fresh context only for material isolation, verification, specialization, parallelism, or context relief; its packet contains goal, inputs, sources, constraints, output, and return contract.
    c. Use same-agent for shared state, tight iteration, atomic sequencing, or most sender context.
    d. Keep private state/policy in orchestrator, make configuration ownership explicit, and prevent child calls to private behavior.
    e. Completion requires supported placements and self-contained fresh packets.

**Outputs:**

    a. Execution-boundary decision for every candidate.
    b. Bounded handoff packet for every fresh-context decision.

### 7. Present the complete plan and obtain approval.

**Inputs:**

    a. Final ledger; configuration results/contracts; boundary decisions/handoffs.
    b. Protected analysis baseline.
    c. Approval response when resuming.
    d. Optional Step 8 collision replanning packet with collision evidence, current plan inputs, and pending approval.
    e. Decomposition result terminal-packet contract.

**Constraints:**

    a. Cover each candidate once: evidence, contract/name, dependencies, second caller, reason, configuration, placement/handoff, destination, and source change.
    b. Check every configured skill root. A collision invalidates approval without overwriting. When the optional Step 8 packet is present, consume its collision evidence, current plan inputs, and pending approval; revise and re-present the complete plan, then run the approval handshake.
    c. Bind exact child contracts, handoffs, refactor, and validation to the fingerprint. Accept only explicit approval bound to this unchanged complete plan/fingerprint.
    d. Without valid approval, output the complete plan plus approval request; pause, obtain the response, then rerun Step 7 with the same declared inputs plus that response. A material change invalidates approval and repeats the handshake.
    e. Explicit rejection or no independently useful candidate goes directly to Step 12 as unchanged-target `no change`; silence/pending does not.
    f. Completion requires approved plan, approval request, or terminal packet.

**Outputs:**

    a. Fingerprint-bound approved decomposition plan.
    b. Complete fingerprint-bound plan and approval-request packet with pending approval.
    c. `no change: <reason>` packet under the Decomposition result terminal-packet contract.

### 8. Create and verify only approved children.

**Inputs:**

    a. Fingerprint-bound approved plan.
    b. Protected analysis baseline.
    c. Global fresh-subagent policy.
    d. Decomposition result terminal-packet contract.

**Constraints:**

    a. Immediately re-read every configured skill root and target fingerprint. Drift creates nothing, invalidates approval, outputs a fingerprint-drift restart packet, and routes to Step 1 before writes.
    b. A new collision creates nothing, invalidates approval, and routes the collision replanning packet to Step 7.
    c. For each candidate invoke `workflow-to-skill` with name, task, complete contract/configuration, conventions, independent trigger, bounded fresh input, and global policy.
    d. Create only through `workflow-to-skill` at `.agents/skills/<name>/SKILL.md`; never hand-author or overwrite.
    e. The Step 8 worker uses its approved plan, protected baseline, global policy, created children, and ledger contract to verify ledger agreement, frontmatter, trigger, inputs, one output, completion criteria, dependency boundary, configuration, handoff, and final `## Procedure`.
    f. Failure leaves source unchanged and goes directly to Step 12. Completion requires exactly approved verified children, restart/replan packet, or terminal packet.

**Outputs:**

    a. Verified approved children, created paths, and verification evidence.
    b. `incomplete` child-creation/verification packet under the Decomposition result terminal-packet contract.
    c. Fingerprint-drift restart packet containing the target, controls, repository context, and approval invalidated or pending.
    d. Collision replanning packet containing collision evidence, current plan inputs, baseline, and pending approval.

### 9. Refactor the target as the orchestrator.

**Inputs:**

    a. Verified children, created paths, and verification evidence.
    b. Fingerprint-bound approved plan.
    c. Protected analysis baseline, including repository instructions and delegation mechanisms.
    d. Decomposition result terminal-packet contract.

**Constraints:**

    a. Immediately re-read target/worktree and compare protected fingerprint/pre-existing state before edits. Drift after children exist preserves target, reports created paths and drift in an `incomplete` packet, and goes directly to Step 12; never restart or overwrite.
    b. Preserve public trigger/output, ordering, authority, errors, and kept responsibilities.
    c. Replace each extraction with one child route, bind its result, and remove duplicates without loss. At fresh boundaries create the receiver, send only the approved packet, and integrate its return.
    d. Pass approved source configuration; keep private state/policy in orchestrator and prevent child calls to it.
    e. Refactor only the original target; preserve unrelated/pre-existing changes. Failure goes directly to Step 12.
    f. Completion requires a verified behavior-preserving original-location orchestrator or terminal packet.

**Outputs:**

    a. Revised source orchestrator, source changes, changed paths, and verification.
    b. `incomplete` refactor/drift packet under the Decomposition result terminal-packet contract.

### 10. Generate and compare the revised callstack.

**Inputs:**

    a. Revised orchestrator, refactor verification, source changes, and changed paths.
    b. Verified children and created paths.
    c. Validated baseline callstack with freshness evidence.
    d. Fingerprint-bound approved plan.
    e. Baseline entry point.
    f. Decomposition result terminal-packet contract.

**Constraints:**

    a. Invoke `workflow-callstack-simulation` on the revised entry point with compact detail, symbolic inputs, and inline output; keep the trace as a run artifact, never append it.
    b. Compare baseline and plan. Confirm each extracted frame routes through one child and kept behavior remains reachable with preserved order, authority, outputs, and errors.
    c. Simulation failure or divergence goes directly to Step 12. Completion requires the source-grounded revised callstack and explicit comparison, or terminal packet.

**Outputs:**

    a. Revised source-grounded callstack and baseline-to-revised comparison.
    b. `incomplete` simulation-failure packet under the Decomposition result terminal-packet contract.

### 11. Verify the approved decomposition.

**Inputs:**

    a. Protected analysis baseline.
    b. Revised orchestrator, refactor verification, source changes, and changed paths.
    c. Verified children and created paths.
    d. Revised callstack and comparison.
    e. Approved plan, final ledger, configuration results, boundaries, and handoffs.
    f. Decomposition result terminal-packet contract.

**Constraints:**

    a. Run discovered repository/link/whitespace checks, or record baseline evidence that none exists.
    b. Confirm one approved route per extraction, all kept items remain, each fresh receiver gets only its packet, configuration ownership is explicit, and no child needs target-private behavior.
    c. Confirm no lost/duplicated behavior, preservation of unrelated/pre-existing changes, plan agreement, and accounting for every ledger item.
    d. Failure goes directly to Step 12. Completion requires evidence for every check or terminal packet.

**Outputs:**

    a. Repository, link, whitespace, routing, kept-state, configuration, behavior, and unrelated-change validation evidence; verified completion state.
    b. `incomplete` validation-failure packet under the Decomposition result terminal-packet contract.

### 12. Report the exact result.

**Inputs:**

    a. One direct-branch terminal packet with target/fingerprint or resolution blocker, all available artifacts, created/changed paths, terminal condition/status, and reasoned `none` for each unavailable field.
    b. Otherwise: baseline, baseline callstack, final ledger, boundaries/packets, approved plan, verified children/paths, revised orchestrator/changes, kept/configuration results, revised comparison, validation, and completion state.

**Constraints:**

    a. Emit these exact fields once and in this exact order: `Target`, `Callstack`, `Ledger`, `Created`, `Changed paths`, `Execution boundaries`, `Source changes`, `Kept`, `Revised comparison`, `Validation`, then `Status`.
    b. Use `Target: <path>@<fingerprint>` or `Target: unresolved (<reason>)`; for unavailable evidence use `<Label>: none (<reason>)`.
    c. Include kept responsibilities and configuration results within `Kept`.
    d. End with exactly one of `Status: complete`, `Status: no change: <reason>`, or `Status: incomplete: <unmet condition>` and emit no other status.
    e. Use `complete` only after every ledger item, approved child at destination, original-location behavior-preserving orchestrator route, and revised callstack pass, plus repository, link, whitespace, routing, kept-state, configuration, behavior, and unrelated-change checks.
    f. A no-change or incomplete run finishes only when this exact report is emitted.
    g. Completion requires the exact report.

**Outputs:**

    a. Decomposition result.
