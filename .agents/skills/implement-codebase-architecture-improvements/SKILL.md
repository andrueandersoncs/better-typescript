---
name: implement-codebase-architecture-improvements
description: Find every architecture deepening candidate and implement each one in its own commit.
disable-model-invocation: true
---

# Implement Codebase Architecture Improvements

Use `$ARGUMENTS` as the scan scope or direction.

Read `@.agents/skills/improve-codebase-architecture/SKILL.md` and follow its Explore phase,
including its `codebase-design`, domain-model, and ADR guidance. Replace its report and grilling
phases with the implementation loop below.

## 1. Establish the baseline

Read the repository instructions, current branch, status, and recent history. Record the initial
HEAD and dirty paths so pre-existing work stays outside every commit.

## 2. Generate the candidate ledger

Complete the full exploration before editing. Record every supported deepening candidate with its
files, problem, proposed change, expected locality and leverage, test seam, recommendation strength,
and ADR implications.

Make the ledger internally compatible: candidates are distinct improvements that can all exist in
the final architecture, not competing implementations of the same seam. Order them by dependency,
then recommendation strength. The ledger is complete when every observed friction point has been
accepted as a candidate or rejected by the deletion test with a recorded reason.

Proceed directly from the completed ledger to implementation.

## 3. Implement every candidate

For each candidate in order:

1. Re-read the affected code after prior commits and confirm the candidate still has a distinct
   outcome.
2. Define its observable behavior and test surface.
3. Implement the deepening with tests, updating `CONTEXT.md` or ADRs when the source skill requires
   it.
4. Run every repository-required formatter, focused test, full check, benchmark, and review before
   committing. Fix all findings attributable to the candidate.
5. Inspect the staged diff against the recorded baseline. Stage only this candidate's
   implementation, tests, and documentation.
6. Commit it once with a concise message naming the deepened module.

Every ledger candidate must produce exactly one commit. Keep candidate changes out of earlier and
later commits. Preserve unrelated work. Stop only for a hard blocker that makes a correct
implementation impossible; report the candidate and concrete evidence.

## 4. Verify the result

Run the repository's complete validation once more. Report the candidate ledger, commit hashes,
validation results, and any hard blocker.
