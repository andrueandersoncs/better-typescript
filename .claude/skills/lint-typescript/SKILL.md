---
name: lint-typescript
description: Orchestrate the repository's independent TypeScript lint rule skills and validate their findings. Use when asked to lint, check, review, or fix TypeScript code, and after changing .ts or .tsx files when the repository's agentic lint rules should be applied.
---

# Lint TypeScript

Run every sibling `lint-rule-*` skill against one explicit scope. Let rule skills own policy and
detection; own scheduling, finding validation, remediation, and the clean rerun here.

## Resolve scope

1. Prefer files or directories named by the user.
2. Otherwise use the TypeScript files changed by the current task, including committed, staged,
   unstaged, and untracked changes.
3. If task scope cannot be recovered, use all first-party `.ts` and `.tsx` files.

Resolve the file list before running any rule. Exclude generated and vendored files unless the user
included them explicitly.

## Discover rules

Find sibling `.claude/skills/lint-rule-*/SKILL.md` files and sort them by path. Treat that set as the
complete rule fleet. Do not maintain a second registry here. If none exist, report that no lint rule
skills are installed; never describe that result as clean.

## Detect

Run each rule in a fresh, read-only agent when parallel agents are available; otherwise run rules
sequentially. Give each agent only its rule skill, the resolved file list, and this output contract:

```text
RULE <skill-name>
CLEAN
```

or one line per finding:

```text
RULE <skill-name>
FINDING <path>:<line> | <evidence> | <concrete remediation>
```

Use the prompt `Use $<skill-name> at <skill-path> to inspect only <files>. Do not edit files.` Do
not let workers broaden scope, apply other rules, or edit concurrently.

## Validate findings

Open every cited location. Reject findings whose evidence is absent, outside scope, or exempted by
the rule skill. Merge duplicate findings at the same source construct while retaining every rule
that detected it. Treat conflicting remediations as an unresolved finding, not permission to choose
silently.

## Remediate

For a review-only request, return the validated findings without editing. Otherwise fix every
validated finding in the coordinator so overlapping edits remain serialized. Follow the repository's
normal test and formatting instructions after editing.

## Verify

Rerun the complete rule fleet against the same scope after remediation. Repeat detection,
validation, and remediation until the fleet is clean or a concrete conflict blocks progress. Never
claim clean when a rule failed to run.

Report the scope, rules run, findings fixed, remaining findings, and verification result.

## Rule skill contract

Require every future rule skill to:

- use the name `lint-rule-<stable-rule-name>`;
- own one independently actionable rule or advice kind, its detection procedure, exemptions, and concrete remediation guidance;
- inspect only the supplied TypeScript scope and remain read-only;
- emit only the detection output contract above; and
- include enough positive and negative examples to distinguish the rule boundary.
