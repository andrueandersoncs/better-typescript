---
name: workflow-to-skill
description: "Create a repository workflow skill as concise, dependency-driven, subagent-ready tasks with completion checks for a repeatable workflow. Use when the user asks to create, design, document, or improve a workflow skill."
compatibility: Requires a runtime that provides the skill-creator skill and concurrent fresh-subagent delegation.
---

# Workflow to Skill

Create a **workflow skill** for the user's repeatable task; this skill governs documenting that task, not carrying it out.

Use this global `workflow-model`: Run each step in this skill and the resulting workflow skill once in a new, fresh subagent. Give every step, workflow input, and output a unique kebab-case identifier. Use unordered `-` items for every list. Format each task input as `- Wait for <step-id> to produce <output-id>.`, `- Use workflow input <input-id>.`, `- Use runtime value <value-id>.`, or `- Use global value <value-id>.` Only `Wait` creates a dependency edge; every `Use` value is available initially. A step is ready when all its inputs are bound; launch all ready steps concurrently and launch newly ready steps immediately. Document order does not control execution. Bind each input or output ID to `$<id>` in the task text and pass the entire rendered task—step ID, title, task text, resolved `Inputs`, `Constraints`, and expected `Outputs`—to the subagent. A blocking question, unavailable `skill-creator`, or unresolved failure stops all downstream work.

## Inputs

- **repeatable-task:** The task the workflow skill will document.
- **intended-skill-name:** The repository skill name, when supplied or useful.
- **task-specific-requirements:** Behavior or completion criteria the workflow must preserve.
- **repository-context:** Relevant commands, paths, conventions, and existing records, discovered as needed.

## Outputs

- **workflow-skill:** A created or revised Markdown workflow skill at `.agents/skills/<name>/SKILL.md` with a predictable contract, executable tasks, and explicit handoffs.

## Tasks

### gather-workflow-contract: Gather the workflow contract from the request and repository

Read the repeatable task: $repeatable-task. Use the intended skill name when helpful: $intended-skill-name. Preserve these requirements: $task-specific-requirements. Treat this repository context as authoritative: $repository-context. Draft a workflow contract that explicitly defines the trigger, accepted inputs, exactly one output, state changes, branches, invariants, and completion evidence. Also return the repository facts and, when revising, the existing target skill.

**Inputs:**

- Use workflow input repeatable-task.
- Use workflow input intended-skill-name.
- Use workflow input task-specific-requirements.
- Use workflow input repository-context.

**Constraints:**

- Treat repository commands, paths, and conventions as authoritative.

**Outputs:**

- draft-workflow-contract: The contract drafted from the request and repository.
- repository-facts: Authoritative repository facts.
- existing-target-skill: The current target skill when revising, otherwise an empty value.

### resolve-workflow-contract: Resolve only gaps that block concrete tasks

Make this draft workflow contract executable: $draft-workflow-contract. Resolve gaps against the original request: $user-request. Use these repository facts: $repository-facts. Infer safe details whenever possible; if one gap truly blocks the work, return that single question instead of a completed contract.

**Inputs:**

- Wait for gather-workflow-contract to produce draft-workflow-contract.
- Use runtime value user-request.
- Wait for gather-workflow-contract to produce repository-facts.

**Constraints:**

- Accept useful input in any workable form.
- Do not invoke a dependency with an unresolved contract.

**Outputs:**

- actionable-workflow-contract: The complete resolved workflow contract.
- blocking-question: One blocking question when the contract remains incomplete.

### confirm-skill-creator: Confirm the runtime can invoke `skill-creator`

Find `skill-creator` in this runtime registry: $runtime-skill-registry. Return whether the dependency is ready and its exact invocation form. If it is unavailable, report that and stop before editing.

**Inputs:**

- Use runtime value runtime-skill-registry.

**Constraints:**

- Editing requires both an actionable workflow contract and an available dependency.

**Outputs:**

- dependency-readiness-decision: Dependency readiness and the supported invocation form.

### set-target-skill-boundaries: Set the target skill's creation boundaries

Turn this workflow contract into clear creation boundaries: $actionable-workflow-contract. When revising, use this existing skill as the behavior-preserving baseline: $existing-target-skill. Set `.agents/skills/<name>/SKILL.md` as the target and identify every file `skill-creator` may create or revise.

**Inputs:**

- Wait for resolve-workflow-contract to produce actionable-workflow-contract.
- Wait for gather-workflow-contract to produce existing-target-skill.

**Constraints:**

- Preserve existing behavior when revising.
- Add helper files only for reusable templates or detailed references.

**Outputs:**

- target-skill-boundaries: The allowed target path and supporting files.

### define-skill-shell: Define the target skill's shell

Design the skill shell within these boundaries: $target-skill-boundaries. Implement this workflow contract: $actionable-workflow-contract. Apply this workflow model: $workflow-model. Require a frontmatter name that matches the directory, a description that states the outcome and concrete request triggers, and `compatibility` that declares concurrent fresh-subagent delegation. Open with one scope-and-boundary sentence, state the execution policy exactly once before `## Inputs`, and order `## Inputs`, `## Outputs`, and final `## Tasks` exactly.

**Inputs:**

- Wait for set-target-skill-boundaries to produce target-skill-boundaries.
- Wait for resolve-workflow-contract to produce actionable-workflow-contract.
- Use global value workflow-model.

**Constraints:**

- Keep `SKILL.md` short.
- Keep contract declarations outside `## Tasks`.
- Keep task work and state changes inside `## Tasks`.

**Outputs:**

- skill-shell-requirements: The required frontmatter and section shell.

### define-input-output-contract: Define a liberal input contract and one predictable output

Derive a liberal input contract and exactly one predictable output from this workflow contract: $actionable-workflow-contract. Format each input as `- **<input-id>:** <description>` and the output as `- **<output-id>:** <description>`, using unique kebab-case identifiers and including the output’s stable result, location, and completion condition.

**Inputs:**

- Wait for resolve-workflow-contract to produce actionable-workflow-contract.

**Constraints:**

- Accept useful input variations and produce one precise result.
- Constrain input source, shape, naming, order, or completeness only when essential.

**Outputs:**

- target-input-requirements: The target skill input contract.
- target-output-requirements: The target skill output contract.

### define-workflow-tasks: Define concise dependency-driven tasks

Turn this workflow contract into the smallest complete set of dependency-driven tasks: $actionable-workflow-contract. Apply this workflow model: $workflow-model. Give each step one observable transition, a completion check, and every input it needs, including explicit prior-step outputs. Make independent steps runnable concurrently and return their requirements with dependencies expressed only through declared `Wait` items.

**Inputs:**

- Wait for resolve-workflow-contract to produce actionable-workflow-contract.
- Use global value workflow-model.

**Constraints:**

- Format each step as `### <step-id>: <action-title>` with a unique kebab-case identifier and no number.
- Place exactly one concise task paragraph immediately below each step header.
- Give each step `Inputs`, `Constraints`, and `Outputs` labels in that order after the task paragraph.
- Format every input as one exact `Wait` or `Use` item from the global `workflow-model`.
- Inject every value ID referenced by `Inputs` into the task paragraph as `$<value-id>` and use no undeclared variables.
- Place one empty line between the task header, task paragraph, each label, and its content.
- Format `Constraints` and `Outputs` as concise unordered lists and each output as `- <output-id>: <description>`, using globally unique kebab-case output IDs.
- Keep work in the task paragraph and reserve `Constraints` for limits, invariants, and acceptance boundaries.
- Add `Wait` items only for true output dependencies so every independent step can run concurrently.

**Outputs:**

- target-task-requirements: The target task graph and format.

### define-branches-invariants: Define branches, invariants, and supporting detail

Use this workflow contract: $actionable-workflow-contract. Follow these task requirements: $target-task-requirements. Ground repository-specific details in these facts: $repository-facts. Define only necessary branches and invariants. Keep each branch beside the task that reaches it and state its condition, action, and result. Move conditional or exhaustive supporting detail into linked references.

**Inputs:**

- Wait for resolve-workflow-contract to produce actionable-workflow-contract.
- Wait for define-workflow-tasks to produce target-task-requirements.
- Wait for gather-workflow-contract to produce repository-facts.

**Constraints:**

- Preserve only necessary invariants, such as source preservation, idempotency, non-overwrite rules, authority boundaries, or required handoffs.
- Prefer repository lookups over duplicated facts.

**Outputs:**

- branch-requirements: Required conditional behavior.
- invariant-requirements: Behavior that must always hold.
- supporting-detail-requirements: Detail that belongs in linked references.

### define-final-result: Define the target workflow's final result

Use this output contract: $target-output-requirements. Use these task requirements: $target-task-requirements. Define exactly what the final task reports and the condition that makes the workflow complete.

**Inputs:**

- Wait for define-input-output-contract to produce target-output-requirements.
- Wait for define-workflow-tasks to produce target-task-requirements.

**Constraints:**

- Require the final task to report the result and completion state.

**Outputs:**

- final-result-requirement: The exact result the final task must report.
- workflow-completion-condition: The condition that makes the workflow complete.

### invoke-skill-creator: Invoke `/skill-creator` with the contract and requirements

Create the target skill for this workflow contract: $actionable-workflow-contract. Stay within these boundaries: $target-skill-boundaries. Apply this workflow model: $workflow-model. Apply the shell, input, output, and task requirements: $skill-shell-requirements; $target-input-requirements; $target-output-requirements; $target-task-requirements. Integrate the branches, invariants, and supporting-detail rules: $branch-requirements; $invariant-requirements; $supporting-detail-requirements. End with $final-result-requirement and complete only when $workflow-completion-condition. Preserve $task-specific-requirements and treat $repository-facts as authoritative. Invoke `skill-creator` using $dependency-readiness-decision and return its result.

**Inputs:**

- Wait for resolve-workflow-contract to produce actionable-workflow-contract.
- Wait for set-target-skill-boundaries to produce target-skill-boundaries.
- Wait for define-skill-shell to produce skill-shell-requirements.
- Wait for define-input-output-contract to produce target-input-requirements.
- Wait for define-input-output-contract to produce target-output-requirements.
- Wait for define-workflow-tasks to produce target-task-requirements.
- Wait for define-branches-invariants to produce branch-requirements.
- Wait for define-branches-invariants to produce invariant-requirements.
- Wait for define-branches-invariants to produce supporting-detail-requirements.
- Wait for define-final-result to produce final-result-requirement.
- Wait for define-final-result to produce workflow-completion-condition.
- Use workflow input task-specific-requirements.
- Wait for gather-workflow-contract to produce repository-facts.
- Wait for confirm-skill-creator to produce dependency-readiness-decision.
- Use global value workflow-model.

**Constraints:**

- The invocation form must match the dependency readiness decision.

**Outputs:**

- skill-creator-result: The result returned by `skill-creator`.

### handle-skill-creator-result: Handle the `skill-creator` result

Inspect this `skill-creator` result: $skill-creator-result. On success, return the resulting `SKILL.md`, its path, the change state, and any assumptions. On unresolved failure, return the error and stop without claiming completion.

**Inputs:**

- Wait for invoke-skill-creator to produce skill-creator-result.

**Constraints:**

- Success requires the target skill to exist with `## Tasks` last.

**Outputs:**

- resulting-skill: The resulting `SKILL.md` on success.
- target-skill-path: The target skill path on success.
- change-state: Whether the target skill was created or updated.
- assumptions: Any assumptions made, otherwise `None`.
- error-report: The unresolved error on failure.

### verify-shell: Verify the frontmatter and section structure

Verify this skill: $resulting-skill. Its target path is: $target-skill-path. Check it against these shell requirements: $skill-shell-requirements. Apply this workflow model: $workflow-model. Verify the frontmatter, routing description, compatibility, maximal-parallelism policy, policy placement, and top-level section order, then return the frontmatter and structure results.

**Inputs:**

- Wait for handle-skill-creator-result to produce resulting-skill.
- Wait for handle-skill-creator-result to produce target-skill-path.
- Wait for define-skill-shell to produce skill-shell-requirements.
- Use global value workflow-model.

**Constraints:**

- Pass only when every check matches the skill shell requirements.

**Outputs:**

- frontmatter-verification-result: The frontmatter verification result.
- section-structure-verification-result: The section structure verification result.

### verify-contract-format: Verify the contract and list formats

Verify this skill: $resulting-skill. Check its inputs against: $target-input-requirements. Check its output against: $target-output-requirements. Apply this workflow model: $workflow-model. Inspect every task header, handoff, task paragraph, label, constraint, and list. Confirm that each task paragraph contains the work and each constraint is only a limit, invariant, or acceptance boundary, then return the contract and format results.

**Inputs:**

- Wait for handle-skill-creator-result to produce resulting-skill.
- Wait for define-input-output-contract to produce target-input-requirements.
- Wait for define-input-output-contract to produce target-output-requirements.
- Use global value workflow-model.

**Constraints:**

- Keep the target skill’s top-level inputs and output as simple unordered lists without item subheadings.
- Accept workable inputs, require only essential constraints, and produce one precise output.
- Format every step as an unnumbered `### <step-id>: <action-title>` header with a unique kebab-case step ID.
- Apply the global `workflow-model` without per-step execution declarations.
- Treat `Wait` items as the complete dependency graph; reject missing, nonexistent, cyclic, or ordering-only step/output references.
- Require exactly one concise task paragraph immediately below each step header.
- Give every step `Inputs`, `Constraints`, and `Outputs` labels in order after the task paragraph.
- Require each input to use an exact global `Wait` or `Use` form and reference a valid value, step, and output ID.
- Require each task paragraph to inject every referenced value ID as `$<value-id>` and contain no undeclared variables.
- Require one empty line between every task element and its content.
- Use concise unordered lists, format each output as `<output-id>: <description>` with a globally unique kebab-case ID, and reject numbered or lettered list markers anywhere.

**Outputs:**

- contract-verification-result: The contract verification result.
- list-format-verification-result: The list format verification result.

### verify-task-executability: Verify the tasks are executable without invented policy

Trace every task in this skill: $resulting-skill. Compare it with this workflow contract: $actionable-workflow-contract. Verify these branch requirements: $branch-requirements. Preserve these invariants: $invariant-requirements. Require this final result: $final-result-requirement. Use this completion condition: $workflow-completion-condition. Apply this workflow model: $workflow-model. Return whether the tasks are executable, self-contained, maximally parallel, and free of invented policy.

**Inputs:**

- Wait for handle-skill-creator-result to produce resulting-skill.
- Wait for resolve-workflow-contract to produce actionable-workflow-contract.
- Wait for define-branches-invariants to produce branch-requirements.
- Wait for define-branches-invariants to produce invariant-requirements.
- Wait for define-final-result to produce final-result-requirement.
- Wait for define-final-result to produce workflow-completion-condition.
- Use global value workflow-model.

**Constraints:**

- Keep inputs and outputs declarative.
- Keep task work and state changes inside `## Tasks`.
- Do not rely on inherited context, prior reasoning, or undeclared state.
- Pass only when each dependency carries required data and every ready task can start immediately.

**Outputs:**

- task-executability-result: The task executability result.

### report-result: Report the verified result

Check the frontmatter result: $frontmatter-verification-result. Check the section-structure result: $section-structure-verification-result. Check the contract result: $contract-verification-result. Check the list-format result: $list-format-verification-result. Check the task-executability result: $task-executability-result. If any check failed, report `Verification failed: <checks>`. Otherwise report three lines: `Workflow skill: $target-skill-path`, `Change: $change-state`, and `Assumptions: $assumptions`.

**Inputs:**

- Wait for verify-shell to produce frontmatter-verification-result.
- Wait for verify-shell to produce section-structure-verification-result.
- Wait for verify-contract-format to produce contract-verification-result.
- Wait for verify-contract-format to produce list-format-verification-result.
- Wait for verify-task-executability to produce task-executability-result.
- Wait for handle-skill-creator-result to produce target-skill-path.
- Wait for handle-skill-creator-result to produce change-state.
- Wait for handle-skill-creator-result to produce assumptions.

**Constraints:**

- Claim completion only when every check passes and the exact path and change state are reported.

**Outputs:**

- completion-report: The completion report when verification passes.
- verification-failure-report: The verification failure report when a check fails.
