---
name: triage-better-typescript
description: >
  Analyze user feedback about TypeScript code produced after a coding agent remediated Better
  TypeScript violations. Use when the user supplies post-remediation code they dislike and wants the
  result traced, corrected, or triaged.
---

# Triage Better TypeScript Remediations

Review the code produced by remediation. Start from the user's concern and trace the disliked code
backward through the rule output and edits that produced it.

## Collect the feedback

Start with:

- the resulting TypeScript code;
- what the user dislikes and what they expected instead;
- the Better TypeScript violations that led to the remediation, when available;
- the original code or remediation diff, when available; and
- the Better TypeScript version, config, and command.

The resulting code and user feedback are enough to begin. Ask only for missing evidence needed to
identify a responsible remediation. Preserve the user's wording instead of translating it into a
rule defect too early.

## Reconstruct the remediation

1. Compare the original and resulting code when both are available. Otherwise inspect git diff,
   local history, or the user's explanation.
2. Identify each construct introduced, removed, or reshaped by remediation.
3. Map each relevant change to the violation and rule message that prompted it.
4. Separate pre-existing code from code produced by remediation.
5. Record uncertainty when the responsible rule or edit cannot be recovered.

A clean Better TypeScript run proves only that no configured violation remains. It does not prove
that the resulting code is good.

## Evaluate the result

Check the user's concern directly. Compare the original, resulting, and preferred shapes for:

- preserved runtime behavior and types;
- readability and local reasoning;
- unnecessary indirection, abstractions, or boilerplate;
- misleading names or weakened domain meaning;
- unsafe casts or lost type information; and
- conflicts or cascades between remediations.

Run focused tests and type checking when the code is available in a project. Do not reapply the same
remediation merely because Better TypeScript still reports it.

## Classify the cause

Use one or more evidence-backed causes:

- **Agent remediation:** the agent chose a poor transformation that the rule did not require.
- **Rule guidance:** the rule message or example steered the agent toward the disliked result.
- **Rule interaction:** satisfying one rule triggered another remediation or forced an awkward
  compromise.
- **Detection context:** the rule matched without enough semantic context for a good remediation.
- **Configuration:** the rule is unsuitable for this file, boundary, or project policy.
- **Unresolved:** the available evidence does not identify the cause.

Distinguish what Better TypeScript requested from what the remediating agent invented.

## Correct and capture

Propose the smallest code correction that addresses the user's feedback while preserving behavior.
Apply it only when the user asked for code changes. Run the relevant tests, type check, and Better
TypeScript again. If the preferred code is reported again, preserve that result as evidence of a
rule, guidance, interaction, or configuration problem instead of cycling back to the rejected code.

Capture a compact remediation case:

```text
User feedback: <what is wrong with the resulting code>
Before: <original code or unavailable>
Violations: <rules and messages that prompted remediation>
After: <resulting code>
Preferred: <corrected shape>
Cause: <classified causes and evidence>
Code action: <repair made or recommended>
Better TypeScript action: <guidance, detection, interaction, or config change; or none>
Verification: <tests, type check, and Better TypeScript result>
```

Finish when the user's concern is explained, the responsible remediation is identified or marked
unresolved, and both the code action and Better TypeScript action are explicit.
