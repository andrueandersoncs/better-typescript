# Verification skill context

Apply this guidance within `author-agent-skill` when the requested artifact is a project-local skill that drives the real application and proves user-visible behavior. `author-agent-skill` remains the owner of authoring, evaluation, and completion. This reference does not verify unrelated product changes.

## Create or refresh the artifact

1. Inspect the repository to identify the user-facing surface, exact launch command and readiness signal, repository-native drive mechanism, observable evidence, cleanup requirements, and isolation boundary. Prefer an existing harness.
2. Author concrete instructions for:
   - **Launch:** start only the instance used for verification and identify when it is ready.
   - **Doctor:** determine whether that instance is healthy and safe to drive.
   - **Drive:** exercise real user entry points through stable handles or commands.
   - **Evidence:** capture the action, resulting state, and material side effects.
   - **Cleanup:** stop only created resources while preserving evidence.
   - **Helpers:** document the invocation of every executable helper the skill owns.
3. Add a small feature map. For each user-facing feature, record what it does, how a user reaches it, how the harness drives it, the observable end state, and known traps.
4. Follow the authored instructions end to end for one mapped feature. Confirm that cleanup leaves the captured evidence intact.
5. If the application cannot start or reach a trustworthy baseline, return a precise blocked result. Do not repair product code from this authoring context.

## Maintain an existing artifact

1. Reconcile the feature-map index and every mapped feature against current source before driving the application.
2. Exercise every mapped feature through live user-facing behavior from a known healthy state. Preserve evidence and clean residue after failed attempts.
3. Change only the verification skill, its feature map, and helpers it owns. Report product regressions instead of rewriting the map to match broken behavior.
4. Return exactly one outcome: `clean` when source and live coverage agree, `changed` when proven corrections were made, or `blocked` when coverage or safe correction could not finish.
