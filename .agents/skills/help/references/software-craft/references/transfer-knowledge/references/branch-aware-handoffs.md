# Branch-aware handoffs

Use for saving or restoring software work across sessions, branches, or worktrees. A handoff describes evidence and next actions; it is not a backup, a second task tracker, or permission to change code.

## Save

1. Record repository identity, worktree location, branch (or detached HEAD), exact revision, and save time with timezone. Omit unavailable facts explicitly rather than inventing them.
2. Distinguish staged, unstaged, and relevant untracked work. Record changed paths and the evidence needed to understand their state without copying secrets or whole diffs. Note work that must not be included in the task.
3. Link the canonical project record, decisions, and verification artifacts. Record what was observed at which revision or working-tree state, unresolved blockers, unsuccessful approaches worth avoiding, and the next authorized action.
4. Use the project's handoff storage convention; temporary handoffs belong outside the repository. When saving snapshots, create a distinct immutable name using recorded time plus a unique suffix as needed. Do not overwrite a prior snapshot or duplicate mutable task status.

Report the saved location and what it can restore: context only. Uncommitted files, ignored artifacts, running services, and credentials do not travel with a summary. Saving does not authorize committing, stashing, pushing, or uploading transcripts.

## Restore

1. Establish the current repository, worktree, branch, revision, and relevant working-tree state before selecting a handoff. Honor a specifically requested handoff, but still check its identity.
2. Otherwise prefer the newest applicable handoff for the current repository and branch; use worktree identity to distinguish concurrent contexts. Order by recorded save time, not filesystem modification time. A newer sibling-branch save must not displace this branch's applicable save.
3. If only cross-branch or cross-worktree evidence is available, identify the mismatch before using it. Do not silently switch branches, reset files, apply patches, or import another task's authority. Ambiguous target intent requires a decision; reading the context need not mutate anything.
4. Reconcile the handoff with current files and the canonical project record. Already completed work stays complete; outdated instructions and revision-specific verification are historical evidence, not current truth. Identify missing uncommitted work or artifacts before proposing their dependent action.
5. Return the selected handoff, material changes since it was saved, retained constraints, blockers, and the next authorized action. Restoring context alone stops here; execution requires an implementation request.

## Source

Synthesized from gstack's [context-save](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/context-save/SKILL.md.tmpl) and [context-restore](https://github.com/garrytan/gstack/blob/0530392821c277b95e5cd65aa9d9fda4248718b2/context-restore/SKILL.md.tmpl). See [provenance and MIT notice](../../../../gstack-sources.md).
