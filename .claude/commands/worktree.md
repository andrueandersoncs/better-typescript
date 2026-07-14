---
description: Start the given task in a new git worktree on a new branch
argument-hint: <task description>
---

Start the following task in a **new git worktree** on a **new branch**. Do not
do the work in the current checkout:

$ARGUMENTS

This command is an explicit exception to the default “work on main” rule: create
a branch and isolate the work in a worktree before implementing.

## Setup

1. Confirm you are in a git repo and record the current branch / dirty state.
   Existing uncommitted work in the current checkout must stay untouched.
2. Derive a short kebab-case name from the task (for example
   `add-no-foo-check`). Use that name for both the worktree and the branch
   unless the user already supplied a name.
3. Create and enter a new worktree branched from `main`:
   - Prefer the `EnterWorktree` tool with `name` set to that kebab-case name
     when available.
   - Otherwise create it with git under `.claude/worktrees/<name>`:
     ```bash
     git fetch origin main 2>/dev/null || true
     git worktree add -b <name> .claude/worktrees/<name> main
     ```
   - If `main` is unavailable locally, branch from `origin/main`, then from
     `HEAD` only if neither exists.
4. All subsequent reads, edits, installs, and verification for this task must
   run inside that worktree. Do not edit files in the original checkout.

## Do the work

Once inside the worktree, complete the task fully. Follow normal project
rules from `AGENTS.md` / `CLAUDE.md` for implementation, verification, and
commits:

- Leave changes uncommitted unless the user explicitly asks to commit.
- After code changes, run `timeout 10 npm run dev` and `npm run bench` as
  required by those rules.
- Do not clean up, remove, or prune the worktree unless asked.

## Handoff

When finished, report:

- worktree path
- branch name
- what changed
- verification run and results
- that changes remain uncommitted (unless a commit was requested)
