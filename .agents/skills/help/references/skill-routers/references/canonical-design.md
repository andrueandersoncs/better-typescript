# Contextual Skill Routing

An agent skill router matches a contextual situation to the skill best suited to handle it.

```text
request + gathered context → matching situation pattern → skill(request, relevant context)
```

## Gather → match → handoff

1. **Gather context.** Understand what the user wants, then inspect the supplied material and available evidence that could change the skill choice: relevant artifacts, what has already happened, the environment, and constraints. Stop when you have enough context to distinguish the plausible matches.
2. **Match the situation.** Compare the request and gathered context with the route patterns by meaning. Choose the closest match supported by the user's goal and the evidence. A more specific pattern wins when its distinguishing facts are present; a shared keyword is not enough. If a missing fact would change the choice, look it up before asking the user.
3. **Hand off before acting.** Load one matching skill's linked `SKILL.md` before carrying out its workflow; a route description is not a substitute for the skill. Pass the original request, relevant findings and their sources, constraints, and any unresolved details it needs. The selected skill owns execution and completion.

When the selected skill is another router, it continues with the same request and gathered context, collecting only additional facts that distinguish its own patterns.

The selected owner may invoke another skill for an explicitly bounded supporting subtask. Pass the original request as context, but the assigned subtask defines the helper's scope; do not route the original request again. Return the helper's result to the owner, which remains accountable for the complete requested outcome.

If no pattern fits, say that the request is outside this router's scope. The router's job ends at the handoff; any multi-step workflow belongs to the selected skill.

## Writing situation patterns

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