---
name: plan-happy-path
description:
  Plan a change as the smallest complete happy-path implementation, then independently verify that
  the plan has no unnecessary scope. Use when asked to plan a feature, change, or bug fix with only
  normal valid input, one direct approach, and narrow verification.
---

# Plan Happy Path

Use this skill to produce a plan only. Do not implement the plan.

## Input

Capture the user's requested change exactly. If the request is ambiguous, ask only the question
required to identify its normal valid input and expected environment.

## Workflow

### 1. Get the proposed plan

Spawn a planner child with `await rlm(...)`. Include the original request and the following
instructions verbatim. Ask the child to send its complete response to its parent with
`await agent_message.send(..., receiver_role="parent")`.

> Plan an implementation for this request without implementing it. Only plan for the normal, valid
> input and expected environment. Only consider the happy-path verification that will prove the
> implementation works. Only include the simplest, complete, viable, approach. Do not include
> alternatives, options, edge-case handling, or optional work. Do not invent abstractions, tools, or
> generalization. Do not edit, create, or delete files, and do not run repository-mutating commands.
> Your target implementation **must be**: (1) minimal, (2) simple, and (3) complete. Return only the
> implementation plan.

Wait for the planner's message and preserve its complete output as the proposed plan.

### 2. Verify the proposed plan

Spawn a separate verifier child. Include the original request, the complete proposed plan verbatim,
and the following instructions verbatim. Ask the child to send its complete response to its parent
with `await agent_message.send(..., receiver_role="parent")`.

> Analyze the proposed plan against this exact rule:
>
> "Choose the simplest, **complete** implementation that works for the normal, valid input and
> expected environment. Plan for an implementation of the one direct happy path. Disregard edge
> cases, alternative approaches, optional behavior, configuration options, retries, fallbacks,
> recovery paths, compatibility shims, extensibility, and speculative future requirements."
>
> Read only the repository code needed to determine whether every planned change is required for
> that happy path. DO NOT read other plans, as they may have been generated with an outdated version
> of the prompt. Judge only conformity to the quoted rule, not stylistic preferences. Return
> `APPROVED` if the whole plan conforms. Otherwise return `REJECTED`, quote each part that adds
> unnecessary scope, and state the exact correction needed. Do not edit, create, or delete files,
> and do not run repository-mutating commands. Return only the verdict and, when rejected, the
> corrections.

Wait for the verifier's complete response.

### 3. Repeat until approved

If the verifier returns `REJECTED`, send its complete corrections to the planner as hard
constraints. Obtain a revised plan, then use a separate verifier child to review that complete
revised plan. Repeat until a verifier returns exactly `APPROVED`.

Do not make planning or verification decisions yourself: preserve the planner output, verifier
verdict, and original request verbatim between agents.

### 4. Save and report

Create `.scratch/plans/` if needed. Write a descriptively named Markdown document that contains:

1. The original request
2. The finalized plan
3. The complete `APPROVED` verdict

Report the document path and do not implement the plan.
