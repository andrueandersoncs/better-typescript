---
name: ship-change
description: Move completed software safely through integration, migration, verified package artifacts, package publication, or service deployment. Use for branch completion, releases, production migrations, deprecations, CI/CD, launch, rollback, or merge conflicts.
---

# Ship Change

## Inputs

The verified software candidate, requested delivery state, current repository or deployment state, authority, environment, and rollback boundary.

## Select mode

- **Conflict:** reconcile an active merge or rebase.
- **Integration:** merge, publish for review, keep isolated, or discard completed branch work.
- **Migration:** move consumers, data, schemas, APIs, or deprecated behavior safely.
- **Release:** produce a verified package artifact, publish a package when requested, or automate, document, observe, deploy, stage, monitor, and roll back a service.

Modes may compose. Run only the selected mode's steps and completion gate; a verified artifact does not authorize package publication or deployment.

## Common entry

Use [verify-change](../verify-change/SKILL.md) for the candidate's generic software claim-to-observation proof. Confirm the relevant base, revision, environment, authority, and rollback boundary; retain the selected mode's safety order, surface-specific evidence, and documentation walkthroughs.

## Conflict

Inspect merge state and history, trace each side to its source intent, preserve both contracts where possible, resolve every hunk, run affected checks, and complete the merge or rebase.

## Integration

Present the applicable choice: merge, publish/open review, keep isolated, or explicitly discard. Reverify a merged result. Protect uncommitted work and require deliberate confirmation for destructive cleanup.

## Migration

Use **expand → migrate bounded consumer batches → switch and bake → contract**. Verify mixed-version behavior, backfill progress, rollback, and zero old-path use before removal. Publish the consumer guide and removal schedule.

## Release

Choose the requested delivery outcome. Do not advance to a later outcome unless it was requested.

### Verified package artifact

For an npm-distributed TypeScript package, apply [the npm publishing recipe](references/npm-publish-tool.md#release-recipe) through the exact-tarball consumer exercise. Inspect the tarball and retain its consumer-check evidence. Stop there: do not publish it, deploy it, or require production monitoring or rollback.

### Published package

First complete the verified-package-artifact outcome. Then use the recipe to publish that exact tarball, collect registry readback evidence, and establish the registry- and authority-appropriate recovery action before publishing.

### Deployed service

1. Encode economical automated gates in dependency order: static checks, focused tests, build, integration/runtime checks, security/dependency checks, and release budgets.
2. Update required public API docs, rationale, migration guide, changelog, and any warranted ADR. Use [technical-documentation](../../../technical-documentation/SKILL.md) for the relevant document contracts; exercise consumer and migration walkthroughs.
3. Derive structured logs, bounded metrics, trace context, actionable alerts, and a runbook from 2–4 concrete on-call questions.
4. Predeclare rollout stages, health thresholds, rollback triggers, steps, and recovery time. Use a disabled flag, internal exposure, canary, then measured expansion when risk warrants it.
5. Monitor the first meaningful production window, compare with thresholds, and remove temporary flags or compatibility paths on schedule.

## Output

The requested conflict resolution, integration, migration, or one release outcome with its mode-specific evidence:

- a verified package artifact with an exact-tarball consumer check;
- a published package with registry evidence and applicable recovery action; or
- a deployed service with production-threshold, monitoring, and rollback evidence.

## Done

- **Conflict:** repository conflict state is cleared and affected behavior passes.
- **Integration:** the chosen branch/worktree outcome is complete and its integrated result is verified.
- **Migration:** intended consumers use the new path, rollback remains valid through the bake window, and removal follows verified zero use.
- **Verified package artifact:** the exact tarball has passed its consumer exercise; it has not been published or deployed unless separately requested.
- **Published package:** the exact verified tarball is published, its identity and version have registry readback evidence, and the applicable recovery action is established.
- **Deployed service:** the deployed revision is observable, meets its declared production thresholds through the monitored window, and can be rolled back by the predeclared procedure.