---
name: complete-scratch-issues
description:
  Audits local Markdown issues under .scratch, verifies which tickets are actually incomplete,
  repairs stale statuses and checklists, and delegates ready implementation tickets to subagents
  using Matt Pocock's /implement skill. Use when asked to find, reconcile, or complete outstanding
  .scratch issues.
---

# Complete Scratch Issues

Throughout this skill, `$ARGUMENTS` means any scope or constraints supplied by the user.

Audit and complete the relevant `.scratch/` issues. Treat repository evidence as authoritative and
issue metadata as a claim to verify.

## 1. Load the tracker contract

Read these before classifying anything:

- `AGENTS.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- the relevant `spec.md`, `map.md`, issue files, and linked comments or assets

Inspect only `.scratch/*/issues/*.md` as tickets. Do not mistake specs, maps, or research notes for
issues. If `$ARGUMENTS` narrows the effort or ticket set, honor it.

## 2. Inventory and verify

For every ticket, record its type, status, blockers, acceptance items, and terminal evidence.
Recognize both bold metadata and wayfinding metadata such as `Type: prototype Status: resolved`.

Select candidates when any of these apply:

- the status is nonterminal;
- an acceptance box is unchecked;
- status and acceptance boxes disagree;
- a research/prototype ticket is marked resolved without an `## Answer`;
- the implementation or tests visibly contradict a terminal status.

Verify each candidate against the current checkout:

1. Read the complete ticket and specification.
2. Inspect the implementation, tests, history, and linked artifacts.
3. Map every acceptance item to concrete evidence.
4. Run the smallest focused verification needed to distinguish complete from incomplete.
5. Treat checked boxes, later dependent tickets, commit messages, and file existence as leads—not
   proof.

Classify a ticket as:

- **complete** only when every acceptance item is present and its relevant verification passes;
- **incomplete** when at least one item is demonstrably absent or failing;
- **uncertain** when a maintainer decision, missing information, or unavailable verification blocks
  a sound conclusion.

Do not alter source code during this audit phase.

## 3. Repair tracker metadata

Make metadata reflect the verified state:

- completed implementation ticket: `done`, with satisfied acceptance boxes checked;
- completed research, prototype, or wayfinding ticket: `resolved`, with an `## Answer`;
- fully specified incomplete implementation ticket: `ready-for-agent`, with unsatisfied boxes
  unchecked;
- maintainer decision required: `needs-triage`;
- reporter information required: `needs-info`;
- human-only implementation: `ready-for-human`;
- rejected work: `wontfix` only when an explicit decision supports it.

Preserve the file's existing metadata style. Append a short dated `## Comments` entry whenever a
status is repaired, stating the evidence used. Never mark work complete merely because a downstream
ticket says it is complete.

## 4. Build the implementation frontier

Resolve blockers within each effort by ticket number. A blocker is satisfied only when its ticket is
verified `done` or `resolved`. A `wontfix`, missing, uncertain, or incomplete blocker requires
reassessment; it does not silently unblock dependents.

The frontier contains only verified-incomplete, unblocked `ready-for-agent` tickets. Process it in
stable effort/path and ticket-number order, recomputing the frontier after each completion. Leave
`needs-triage`, `needs-info`, and `ready-for-human` tickets for the maintainer and report why.

## 5. Delegate implementation through `/implement`

Delegate every frontier ticket to a fresh subagent. The subagent prompt must begin with the explicit
Matt Pocock skill invocation:

```text
/implement @.scratch/<effort>/issues/<ticket>.md

Implement this ticket against its linked spec and current checkout. Read and obey AGENTS.md. Do not
commit: this repository requires changes to remain uncommitted. Do not modify unrelated work. Prove
every acceptance item, run all repository-required checks, and return files changed, commands and
results, review findings, and anything unresolved. Leave ticket status changes to the coordinator.
```

Use the runtime's real subagent primitive; do not simulate a subagent. Keep only one write-capable
implementation subagent active at a time because all agents share the current checkout. Separate
subagents may handle successive tickets, but never let them race on source, tests, or tracker files.

The repository's no-commit rule overrides `/implement`'s default commit step. All other `/implement`
steps, including TDD where applicable, regular focused checks, the final full suite, and code
review, remain required.

## 6. Validate and close each ticket

After a subagent returns:

1. Inspect its diff; preserve pre-existing user changes.
2. Check every acceptance item yourself against the resulting checkout.
3. Confirm focused tests and all gates required by `AGENTS.md`. If TypeScript changed, this includes
   formatting, the sub-100ms benchmark, and an empty self-host report.
4. If anything fails, send a focused follow-up to an implementation subagent using `/implement`
   again; do not paper over failures or check boxes early.
5. Once all evidence passes, check the acceptance items, set the status to `done`, and append a
   short dated completion comment with verification commands.
6. Recompute blockers and continue until the frontier is empty.

Never discard, reset, commit, or overwrite unrelated changes. Never claim a command passed unless it
was actually run in the project environment.

## 7. Report

Return a concise summary containing:

- statuses corrected;
- tickets completed by subagents;
- remaining incomplete tickets grouped as blocked, needs-triage, needs-info, or ready-for-human;
- verification commands and results;
- final uncommitted files.
