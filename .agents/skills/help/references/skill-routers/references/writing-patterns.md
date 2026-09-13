# Writing and checking skill routers


A pattern describes a recognizable situation and names the skill that handles it. Include only facts that distinguish that skill from the others. Current state and desired result can be useful cues, alongside domain, artifact, audience, and constraints.

Use a simple situation-to-skill table. Describe overlapping patterns more precisely so the agent can distinguish them from context. Keep shared routing instructions in one place, reuse existing skills, and leave each skill's procedure and completion rules in that skill.

## Example

| Situation pattern | Skill |
| --- | --- |
| A failure or performance problem needs investigation because its cause is unknown. | `diagnose-problem` |
| A measured performance bottleneck needs improvement against a known target. | `optimize-system` |
| An existing change needs an independent assessment. | `review-change` |
| A defined behavior needs implementing or changing. | `implement-change` |

For “Fix slow checkout,” the agent reads the available profile and requirements. They show a 900 ms response against a 200 ms budget, with N+1 queries responsible for the delay.

The situation matches `optimize-system`. The handoff includes the original request, the profile and its source, the latency budget, and any behavior that must be preserved. Without a known cause, the same request would match `diagnose-problem`.

“Review the change that fixes slow checkout” matches `review-change`: the requested work is an assessment of an existing change. “Explain idempotency” fits none of these patterns.

## Checking a router

Try representative requests in fresh context. Check which evidence the agent gathers, which skill it chooses, and whether the handoff preserves what that skill needs.

Vary the context while keeping the request unchanged, then vary the intent while keeping similar wording. Include nearby work outside the router's scope. These cases should expose missing context, overlapping patterns, keyword matching, and lost handoff information.