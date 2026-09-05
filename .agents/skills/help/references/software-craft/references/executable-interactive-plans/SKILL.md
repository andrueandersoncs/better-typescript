---
name: executable-interactive-plans
description: Produce a human-approved Effect contract artifact with a current/proposed scope review, executable story properties, and exact contract source. Use when that change surface must be agreed before implementation.
compatibility: Requires a browser, a local JavaScript runtime, Effect v4, and @effect/vitest.
---

# Executable Interactive Plans

Review change scope and exact Effect contracts, check executable story properties, and record the human decision.

## Inputs

- The user stories and caller-visible outcomes to express
- The owning Effect workspace and relevant repository conventions
- A genuine current declaration baseline and the proposed declaration source
- The artifact destination

For a change to existing code, copy the current local declaration tree into the artifact before writing the proposal. Keep its relative imports local so a current module can never resolve a proposed definition. Declare `currentCode` and `proposedCode` inventories and pair revisions with the same stable declaration ID; additions and removals appear on only their applicable side. Entirely new work may use `currentCode: []`.

The human reviews three questions:

1. **Is this declared, contextual, and structural scope the change I intend?**
2. **Do the exact current and proposed Schemas, Interfaces, Types, and function signatures express that scope?**
3. **Do these tests express the behavior I want?**

Read the shared [Effect context](../effect.md) and [the detailed method](references/executable-interactive-plans.md). Start from [the story-test template](assets/story-test-template).

Apply [Gall's Law](../../../software-laws/references/reference.md#galls-law) to keep the artifact complete and small. Under [Hyrum's Law](../../../software-laws/references/reference.md#hyrums-law), compatibility can also depend on observable behavior outside the reviewed declarations; inspect actual consumers before changing it.

## Contract and story requirements

Build `scopeGraph` from SchemaAST composition and declarations' explicit dependency and Effect-contract metadata: input, success, error, service, and dependency IDs. Do not infer compatible wires, scan a repository for nodes, or invent runtime call graphs. The board distinguishes declared edits, unchanged source context, and structural/dependency effects; unchanged source is context, not evidence that behavior is unaffected.

Each story owns an `@effect/vitest` property generated from the proposed Schema, using a fresh fixture Layer and calling the proposed function. A function's complete Error channel is not an assertion of every Error; record only the Errors the property asserts. A legitimate `never` channel needs no invented Error. Keep one test file per property so the whole file is the editable range.

Inspection imports local trusted declarative modules, which execute their top-level initializers and force lazy Schemas; it never runs tests or proves behavior. Keep business side effects out of those modules: the viewer is not a sandbox.

## Workflow

### 1. Capture scope and name stories

Keep authored story order. Capture the genuine current snapshot, write the paired proposal, and state each story's caller-visible outcome and declaration IDs it exercises.

### 2. Create and fill the artifact

Run from the loaded skill's base directory:

```sh
node scripts/create-plan.mjs <artifact-destination>
```

Replace plan data, current and proposed declaration source, story tests, and theme tokens. Keep the shared review shell and review server.

### 3. Review scope, source, then evidence

Start with the top-down Three scope board, or its keyboard-accessible no-WebGL list, to review declared edits, source context, and structural/dependency effects. Then use the exact Monaco current/proposed source diff as the authority for Schemas, Interfaces, Types, and function signatures. Finally run and edit Story Tests, make the explicit approval decision, and export the review.

The server binds results to current test and dependency content, invalidates only affected tests, and blocks approval for unresolved save failures. Source changes clear the decision; approval requires every current property to pass. Use [Goodhart's Law](../../../software-laws/references/reference.md#goodharts-law) to distinguish green fixture-agreement evidence from the required human decision.

## Output

Return:

- The browser URL
- The artifact path
- The current source-snapshot ID
- The story-test result summary
- The one next human action

## Done

Every current story property passes against the exact proposed contracts, the human has explicitly approved the current source snapshot, and the returned artifact path, browser URL, snapshot ID, and result summary identify that approved state.

