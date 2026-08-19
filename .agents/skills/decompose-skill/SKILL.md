---
name: decompose-skill
description: Decompose a skill into independently useful workflow skills and identify fresh-context agent or subagent handoffs while retaining a behavior-preserving orchestrator. Use when asked to split, extract, modularize, or find reusable workflow skills or agent boundaries within an existing skill.
compatibility: Requires workflow-to-skill and workflow-callstack-simulation, plus agent or subagent delegation when an approved boundary requires fresh context.
---

# Decompose Skill

Decompose reusable responsibilities from one skill into independently invocable workflow skills and deliberate fresh-context handoffs; do not extract source-private steps, incidental helpers, or orchestration that has no credible use on its own.

## Inputs

### A. Target skill

A required repository-relative skill directory or `SKILL.md` path. Read the complete skill directory and identify the behavioral entry point to analyze. The target remains the public orchestrator unless the approved plan explicitly replaces it.

### B. Decomposition controls

Optional user-supplied focus areas, proposed child names, naming constraints, configuration preferences, agent or subagent boundary preferences, or exclusions. In their absence, analyze the whole target, derive Agent Skills-compliant kebab-case names, and place child skills under the active repository's `.agents/skills/` root through `workflow-to-skill`.

### C. Repository context

Required repository instructions, skill-root conventions, relevant sibling skills, references, scripts, consumers, tests, validation commands, and available agent or subagent delegation mechanisms. This context is authoritative for local paths and behavior and supplies evidence for or against independent use.

### D. Decomposition approval

The user's explicit approval of the exact candidate ledger, child contracts, configuration splits, agent or subagent execution boundaries, handoff packets, names, destinations, and source refactor. It is absent during analysis and required before any file is created or changed.

## Outputs

### A. Candidate ledger

A conversational ledger covering every callstack-derived candidate exactly once. Each entry gives its source frames and transitions, cohesive responsibility, proposed contract and name, dependency boundary, a credible invocation outside the target, independent-use decision, fresh-context benefit and `same agent` or `fresh-context agent/subagent` execution decision, required handoff packet, and—when not selected—the result of the configuration-split test and final reason for keeping it in the target.

### B. Extracted workflow skills

For every approved selected candidate, a complete `.agents/skills/<name>/SKILL.md` created by `workflow-to-skill`, including its generated final `## Callstack Simulation`. Each child has a public trigger and complete outcome, can be invoked without the source skill's private control state, accepts any source-specific variation as explicit configuration rather than depending on the source, and declares enough bounded input context for a fresh receiving agent to execute it when that boundary is selected.

### C. Revised source skill

The target skill revised in place as a behavior-preserving orchestrator. It retains its public contract and source-specific policy, delegates each extracted responsibility through the child's declared contract and approved same-agent or fresh-context boundary, passes a self-contained handoff packet to any receiving agent or subagent, contains no duplicate implementation of that responsibility, and has a regenerated source-grounded callstack.

### D. Completion report

A report listing the target, created child paths, source changes, selected execution boundaries and handoffs, kept candidates with reasons and configuration-split results, validation performed, and status. It is complete when the approved decomposition is fully accounted for, or when a permitted no-change or stopping condition is named without claiming files were created.

## Procedure

### 1. Resolve the target and protect the baseline

Resolve Input A from the repository root; read the complete skill directory, Input C, and every repository reference needed to understand its behavior and consumers. Record the target's public contract, behavioral entry point, file manifest or source fingerprint, current call edges, configured skill names, existing destinations, and pre-existing worktree changes. Confirm that both `workflow-to-skill` and `workflow-callstack-simulation` are available before editing, and record the runtime's available same-agent and fresh-context agent or subagent delegation mechanisms. If the target or entry point is missing or ambiguous, a dependency is unavailable, or a proposed destination already exists, stop before writing and report the blocker; never overwrite a child skill or alter unrelated pre-existing changes. This step is complete when the analysis baseline and protected paths are explicit.

### 2. Obtain a source-grounded callstack

Inspect the target's exact `## Callstack Simulation` section when present and compare it with the current entry point, ordered operations, branches, local calls, state changes, side effects, returns, and errors. Use it only when it is the sole final section, structurally valid, source-grounded in the current target and behavior-bearing references, and covers current operations and feasible branches without scenario-specific or unexplained frames. If it is absent, malformed, truncated, scenario-specific, or stale, call `workflow-callstack-simulation` for the current target and entry point with compact detail, symbolic inputs and external responses, and inline output; do not edit the target merely to store this analysis trace. If simulation is blocked or unresolved, stop without changing files. Re-read the target after obtaining the trace; if its fingerprint changed, discard the trace and repeat this step. Record whether the trace was reused or generated. This step is complete when one validated callstack is fixed as decomposition evidence.

### 3. Enumerate cohesive candidate and context boundaries

Walk the validated callstack together with the target source and map each distinct frame or cohesive subtree that could own a repeatable outcome. Merge adjacent frames that only become meaningful as one end-to-end result; separate branches only when each has its own stable contract. At every callstack transition, also record the minimum state the receiver needs and whether upstream history is relevant or incidental. Include candidates even when they initially appear source-specific so later tests can assess them. Do not treat callstack depth alone as proof of reuse or a fresh-context boundary, and do not invent behavior absent from the target or repository. This step is complete when every plausible workflow and context boundary is represented once and its source frames, transitions, dependencies, and required context are traceable.

### 4. Evaluate fresh-context execution boundaries

For every candidate transition, compare same-agent execution with a receiving agent or subagent that starts from a bounded handoff packet. Select a fresh-context boundary only when isolation from unrelated history, independent verification, specialization, parallel work, or context-budget relief materially improves the task and the sender can provide the complete goal, inputs, authoritative sources, constraints, expected output, and return contract. Keep same-agent execution when the work needs shared mutable state, tight iterative coordination, atomic sequencing, or a handoff would reproduce most of the sender's context. Record the evidence and decision in the ledger. A helpful fresh context is a placement decision, not proof that the candidate is independently useful or deserves its own workflow skill. This step is complete when every candidate has a supported `same agent` or `fresh-context agent/subagent` decision and every selected handoff is self-contained.

### 5. Apply the independent-use gate

For each candidate, identify a concrete trigger, complete observable outcome, inputs, outputs, completion evidence, authority boundary, and at least one concrete second caller or scenario outside the target. Select it provisionally only when it is cohesive, independently invocable without target-private setup or control state, useful outside the target rather than merely theoretically generic, and leaves the source able to preserve its behavior through a clear handoff. Reject mere sequencing, one-off source policy, tiny incidental checks, formatting fragments, and candidates whose only consumer would still be the source. Resolve overlaps by selecting the smallest non-overlapping boundaries that remain complete and independently useful. Treat the Step 4 execution decision only as evidence: a candidate still must pass this independent-use gate before decomposition. This step is complete when every candidate has a supported provisional select-or-keep decision.

### 6. Test configuration extraction for every kept candidate

For every candidate not provisionally selected, attempt to split it into (a) a fixed reusable workflow and (b) declarative source-specific configuration. Define the proposed configuration fields, ownership, validation, and a sensible default when one is justified; a required explicit configuration is acceptable when no honest default exists. Retest the split against the current source configuration and one materially different concrete caller or configuration; the current configuration or default must reproduce the original behavior. Promote the transformed candidate only if the fixed workflow and completion contract stay stable, the configuration contains values or bounded policy rather than executable source-private behavior, and the second caller would use the outcome independently. Keep it in the target if configuration would encode most of the algorithm, expose private orchestration or mutable state, provide no stable boundary, or still leave no independent use. Record this test even when its result is `not reusable through configuration`. If the split promotes a candidate, repeat the Step 4 placement test against its new bounded contract. This step is complete when every non-selected candidate has a documented split attempt and final decision plus an execution-boundary decision for any promoted form.

### 7. Present and approve the decomposition plan

Present Output A with proposed child names, exact contracts, configuration and defaults, callstack evidence, same-agent or fresh-context execution decisions, complete handoff packets, source-to-child handoffs, planned target changes, destinations, and validation. Check the names against all configured skill roots and reject collisions before asking for approval. If no candidate passes either reuse test, record `no independently useful candidates` and skip to Step 11 without writing. Otherwise ask for explicit approval of the whole current plan; if the user changes any candidate, contract, name, configuration, or source refactor, revise and re-present it because prior approval does not carry forward. If approval is withheld, record that result and skip to Step 11 without writing. No file may change before approval. This step is complete when the exact plan is approved or a no-change or withheld-approval result is recorded.

### 8. Create the approved child skills

For each approved candidate, call `workflow-to-skill` with its repeatable task, intended name, complete contract, configuration schema and defaults, repository context, the requirement that it be independently invocable, and the bounded input context a fresh receiving agent needs when that placement was approved. Do not hand-author a substitute child or add unapproved behavior. After each call, verify its frontmatter, trigger, inputs, outputs, completion criteria, dependency boundary, configuration, fresh-context handoff contract when applicable, and final generated callstack against the approved ledger. If any creation or verification fails, leave the source unchanged, skip to Step 11, and report every child already created plus the failure; do not claim the decomposition complete. This step is complete when all and only the approved child skills exist and match their contracts.

### 9. Refactor the target into the orchestrator

Only after every child validates, revise the target so its existing public trigger and outcome remain intact while extracted frames become explicit child calls or handoffs. For a selected fresh-context boundary, direct the orchestrator to delegate the child workflow to a new receiving agent or subagent with only the approved handoff packet and to bind its declared result before resuming; otherwise retain same-agent execution. Keep source-specific configuration and defaults in the source unless the approved child contract owns them, pass them explicitly, and remove the duplicated extracted instructions. A child may depend on declared runtime or repository context but never call back into target-private behavior; the orchestrator, not the child, owns agent creation, handoff, and result integration. Preserve unselected candidates, authority boundaries, error behavior, ordering guarantees, and source files unrelated to the approved plan. This step is complete when the target expresses orchestration rather than duplicate child implementation and its public behavior remains traceable.

### 10. Regenerate callstacks and verify the decomposition

Call `workflow-callstack-simulation` on the revised target entry point and replace its prior final `## Callstack Simulation` content with the raw regenerated trace, leaving exactly one such final section. Re-read the target and every child; verify all local links, configured repository checks, and whitespace checks. Compare the new call graph with the baseline to confirm that each extracted frame routes through exactly one child at its approved same-agent or fresh-context boundary, every receiving agent gets a sufficient but bounded handoff, every kept frame remains in the target, configuration ownership is explicit, no child requires target-private state, no behavior was lost or duplicated, and no unrelated file changed. If any check fails, report the incomplete state without claiming success. This step is complete when the approved graph and filesystem changes are valid and source-grounded.

### 11. Report the exact result

Report `Target: <path>@<fingerprint>`, `Callstack: <reused|generated> (<freshness evidence>)`, `Created: <paths|none>`, `Execution boundaries: <candidate — same agent|fresh-context agent/subagent — handoff summary|none>`, `Source changes: <summary|none>`, `Kept: <candidate — reason — configuration result|none>`, `Validation: <checks>`, and `Status: <complete|no change: reason|incomplete: unmet condition>`. Use `complete` only when every approved child and the revised source satisfy Outputs B and C; use `no change` only when analysis or withheld approval caused no writes, and list partial creations under `Created` when a later failure prevented completion. The workflow is complete when this report accounts for every ledger entry and every changed path without overstating the result.

## Callstack Simulation

**Decompose Skill**(symbolic target skill, symbolic decomposition controls, symbolic repository context, symbolic decomposition approval)
│
├─ **Resolve The Target And Protect The Baseline**(target skill, controls, repository context)
│  │
│  ├─ **Read Complete Skill And Repository Evidence**(resolved skill directory, instructions, conventions, siblings, consumers, tests, validation, delegation mechanisms)
│  │
│  ├─ **Record The Analysis Baseline And Protected Paths**(public contract, behavioral entry point, fingerprint, call edges, configured names, destinations, worktree changes)
│  │
│  ├─ if (the target or entry point is missing or ambiguous, a dependency is unavailable, or a proposed destination exists): stop before writing and report the blocker
│  │
│  └─ else: protect the baseline, existing children, and unrelated pre-existing changes
│
├─ **Obtain A Source Grounded Callstack**(resolved target skill, behavioral entry point, baseline fingerprint)
│  │
│  ├─ **Inspect The Existing Callstack Simulation**(exact final section, current source, behavior-bearing references)
│  │  │
│  │  ├─ if (the section is sole-final, valid, current, complete, and non-scenario-specific): reuse it
│  │  │
│  │  └─ else: require a generated trace
│  │
│  ├─ **Callstack Simulation**(resolved target, behavioral entry point, compact detail, symbolic inputs and external responses, inline output)
│  │  │
│  │  └─ if (generation is blocked or unresolved): stop without changing files
│  │
│  ├─ if (the re-read fingerprint changed): discard the trace and repeat this frame
│  │
│  └─ else: fix the reused or generated trace as decomposition evidence
│
├─ **Enumerate Cohesive Candidate And Context Boundaries**(validated callstack, target source)
│  │
│  └─ **Map Each Candidate Boundary**(cohesive frames or subtree, transitions, dependencies, minimum receiver state)
│     │
│     ├─ if (adjacent frames only produce a meaningful end-to-end result together): merge them
│     │
│     ├─ else if (branches have independent stable contracts): separate them
│     │
│     └─ else: retain each plausible workflow or context boundary once without inferring reuse from depth
│
├─ **Evaluate Fresh Context Execution Boundaries**(every candidate transition, bounded handoff packet)
│  │
│  └─ **Compare Execution Placement**(context relevance, verification, specialization, parallelism, context budget, coordination needs)
│     │
│     ├─ if (fresh isolation materially improves the task and goal, inputs, sources, constraints, expected output, and return contract are complete): record fresh-context agent/subagent
│     │
│     └─ else: record same agent, including shared mutable state, tight iteration, atomic sequencing, or handoffs that reproduce most sender context
│
├─ **Apply The Independent Use Gate**(each candidate, Step 4 placement evidence)
│  │
│  └─ **Assess Independent Use**(trigger, observable outcome, inputs, outputs, completion evidence, authority, second caller)
│     │
│     ├─ if (the boundary is cohesive, independently invocable, concretely useful outside the target, and behavior-preserving): provisionally select the smallest complete non-overlapping candidate
│     │
│     └─ else: keep the sequencing, source policy, incidental check, fragment, private-state dependency, or source-only responsibility in the target
│
├─ **Test Configuration Extraction For Every Kept Candidate**(fixed workflow, proposed declarative configuration, current source, materially different caller)
│  │
│  ├─ **Retest The Configuration Split**(fields, ownership, validation, default or required values, two concrete configurations)
│  │  │
│  │  ├─ if (workflow and completion contract stay stable, configuration is bounded policy, and the second caller independently uses the outcome): promote the transformed candidate
│  │  │
│  │  └─ else: record not reusable through configuration and keep it in the target
│  │
│  └─ **Evaluate Fresh Context Execution Boundaries**(each promoted bounded contract, complete handoff packet)
│     │
│     ├─ if (fresh-context benefit is material and the packet is complete): record fresh-context agent/subagent
│     │
│     └─ else: record same agent
│
├─ **Present And Approve The Decomposition Plan**(complete candidate ledger, contracts, names, configurations, placements, handoffs, target changes, destinations, validation)
│  │
│  ├─ **Check Proposed Names**(all configured skill roots)
│  │  │
│  │  └─ if (a collision exists): reject it before requesting approval
│  │
│  ├─ if (no candidate passes either reuse test): record no independently useful candidates and skip to Step 11 without writing
│  │
│  ├─ else if (approval is withheld): record withheld approval and skip to Step 11 without writing
│  │
│  ├─ else if (the user changes the plan): revise and re-present it; after three modeled presentations, mark further repetitions truncated
│  │
│  └─ else: bind exact approval and permit only the approved writes
│
├─ **Create The Approved Child Skills**(each approved candidate and contract)
│  │
│  ├─ **Workflow Skill**(repeatable task, intended name, complete contract, configuration, repository context, independent invocation, bounded fresh-context input)
│  │
│  ├─ if (any creation or verification fails): leave the source unchanged, retain and report children already created, and skip to Step 11
│  │
│  └─ else: continue only after all approved children validate against the ledger
│
├─ **Refactor The Target Into The Orchestrator**(validated children, approved source refactor, protected baseline)
│  │
│  └─ **Route Each Extracted Responsibility**(child contract, explicit configuration, approved placement, approved handoff packet)
│     │
│     ├─ if (placement is fresh-context agent/subagent): create a new receiver with only the packet, delegate the child, and bind its declared result
│     │
│     └─ else: invoke the child in the same agent and bind its declared result
│
├─ **Regenerate Callstacks And Verify The Decomposition**(revised target, children, baseline, approved graph)
│  │
│  ├─ **Callstack Simulation**(revised target entry point, compact detail, symbolic inputs and external responses, inline output)
│  │
│  ├─ **Replace The Final Callstack Simulation**(raw regenerated trace, exactly one final section)
│  │
│  └─ **Verify The Approved Graph And Filesystem Changes**(links, repository checks, whitespace, handoffs, configuration ownership, behavior preservation, duplication, unrelated files)
│     │
│     └─ if (any check fails): retain the incomplete state and do not claim success
│
└─ **Report The Exact Result**(target and fingerprint, callstack freshness, created paths, execution boundaries and handoffs, source changes, kept candidates and configuration results, validation)
   │
   ├─ if (every approved child and revised source satisfy their contracts): report complete
   │
   ├─ else if (analysis or withheld approval caused no writes): report no change with the reason
   │
   └─ else: report incomplete with every unmet condition and partial creation
