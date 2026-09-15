# Contextual Skill Routing

An agent skill router matches a contextual situation to the skill best suited to handle it.

```text
request + gathered context → matching situation pattern → skill(request, relevant context)
```

## Gather → match → handoff

1. **Gather context.** Understand what the user wants, then inspect the supplied material and available evidence that could change the skill choice: relevant artifacts, what has already happened, the environment, and constraints. Stop when you have enough context to distinguish the plausible matches.
2. **Match the situation.** Compare the request and gathered context with the route patterns by meaning. Choose the closest match supported by the user's goal and the evidence. A more specific pattern wins when its distinguishing facts are present; a shared keyword is not enough. If a missing fact would change the choice, look it up before asking the user.
3. **Hand off before acting.** Load one matching skill's linked `SKILL.md` before carrying out its workflow; a route description is not a substitute for the skill. Pass the original request, relevant findings and their sources, constraints, existing authorization, completion criteria, and any unresolved details it needs. The selected skill owns execution and completion.

When the selected skill is another router, it continues with the same request and gathered context, collecting only additional facts that distinguish its own patterns.

The selected owner may invoke another skill for an explicitly bounded supporting subtask. Pass the original request as context, but the assigned subtask defines the helper's scope; do not route the original request again. Return the helper's result to the owner, which remains accountable for the complete requested outcome.

Reuse context already gathered; inspect only what can change the selection. A handoff does not reset authorization or introduce a review stop. Continue through the selected workflow's requested result and relevant verification.
If no pattern fits, handle the request directly when possible; do not force an unrelated skill.

## Execute the selected workflow

The selected skill's inputs, ordered procedure, output, and completion condition form one operating contract. Establish its entry state before producing artifacts. Run dependency-bearing steps in order and take only branches that apply; numbered steps are not optional advice, and an intermediate artifact is not a stopping point.

Evidence gates progress. When a required check or observation fails, repair within scope, repeat the owning step, and rerun downstream work invalidated by the repair. Continue until the completion condition is observed or an external condition blocks all remaining work. A blocked result names the missing condition, completed steps and evidence, and exact resume point.


For router authoring, examples, and fresh-context checks, read [writing and checking patterns](writing-patterns.md).
