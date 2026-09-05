# Behavioral comparison method

Use this method to choose or reject a versioned agent-system candidate. It measures bounded observable contracts; it does not prove that two systems are semantically equivalent.

## Freeze the compared systems

Record the exact source package and one runtime manifest for every arm: tool schemas **and implementations**, parser, sandbox, mounted resources, dependencies, model and decoding settings, budgets, and fixture policy. A matching schema with another implementation is another runtime.

Run real pinned implementations only in authorized isolated fixtures. Source skills, candidates, and teacher output are untrusted inputs, not permission for production effects or broader credentials. Keep permissions, approvals, data access, and sandbox constraints in the runtime.

## Build cases before candidates

Derive cases from production failures and the real task distribution. Each case supplies a fresh fixture and asks the agent to create or edit an artifact, rather than merely describe one. Keep expected values, hidden state, tests, and reference solutions with the verifier; never send them to the evaluated agent.

For the repository compiler, a case has this shape:

```json
{
  "cases": [
    {
      "id": "unique-case-id",
      "family": "behavior-family",
      "prompt": "Edit or write the requested artifact.",
      "files": { "input.txt": "initial bytes" },
      "checks": [
        { "path": "output.txt", "contains": ["required text"], "absent": ["forbidden text"] },
        { "path": "exact.txt", "equals": "exact bytes" }
      ],
      "allowedChanges": ["output.txt", "exact.txt"]
    }
  ]
}
```

The verifier rejects writes outside `allowedChanges` and checks literal `contains`/`absent` strings or exact `equals` bytes. Use exact checks for protected content that must remain unchanged; do not pin incidental capitalization or a preferred paraphrase. Cases express the contract, not a prompt answer key.

Split development and acceptance before candidate work by task family, repository, template, or fixture generator—not random paraphrases. Keep development and acceptance in distinct task families. Development supports selection; keep acceptance suites and expected checks outside candidate generation, tuning, and evaluated agents. Each evaluated agent necessarily receives its current task and fixture. After inspecting acceptance results, retire those cases to development before further optimization and obtain a fresh holdout.

## Compare fairly

Run each arm on cloned starting fixtures with identical tools, budgets, runtime, and decoding settings. Include a no-skill baseline for the same model/runtime whenever judging whether a skill or compiled policy earns its cost. Preserve a retention set for behavior already working.

Use deterministic artifact or final-state verifiers for outcome claims. Use calibrated, evidence-backed judges only where rules cannot decide. Report success by behavior family, repeated-run reliability when relevant, latency, tokens, and total cost per success:

```text
total cost of all attempts in the arm / number of successful attempts
```

Include model, tool, and runtime costs that the deployment would incur. Do not hide failed-attempt cost by averaging only successful runs.

Use paired runs, fixed seeds where possible, appropriate confidence intervals, and a predeclared release rule.

## Select, then accept

Choose candidates only on development results under a predeclared rule. Freeze the selected candidate, its source/runtime versions, and selection record before acceptance. Run acceptance once as an independent decision: accept or reject the frozen candidate. A rejection records the failed contrast and does not deploy or mutate the source system.

Report uncertainty and family-level regressions. A passing holdout supports this bounded release decision; it is not evidence of universal equivalence.