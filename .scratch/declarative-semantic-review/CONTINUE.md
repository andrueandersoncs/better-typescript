# Continue the declarative semantic review epic

Use this document as the entry point for future work.

## Read first

1. [`AGENTS.md`](../../AGENTS.md)
2. [`CONTEXT.md`](../../CONTEXT.md)
3. [`spec.md`](spec.md)
4. [`docs/jev-and-declarative-programming.md`](../../docs/jev-and-declarative-programming.md)
5. The active file under [`issues/`](issues/)

The specification owns the goal, architecture, invariants, non-goals, and delivery order. An issue
owns only its stage.

## Find the current state

Read the issue files in numeric order. Use these states:

| Status | Meaning |
| --- | --- |
| `ready-for-agent` | Unclaimed and available when every blocker is resolved. |
| `claimed` | An agent is actively working on the issue. |
| `resolved` | Acceptance criteria are complete and verified. |
| `needs-info` | External information is required. |
| `ready-for-human` | A human decision or action is required. |
| `wontfix` | The issue will not be implemented. |

A `Blocked by: NN` line is satisfied only when that issue says `Status: resolved`.

The next issue is the lowest-numbered `ready-for-agent` issue whose blockers are all resolved. At
creation time that is `01-extract-route-plan.md`.

Do not trust status alone. Before claiming an issue, compare its acceptance criteria with the current
code and completed issue answers. If the work already exists, verify it and resolve the issue instead
of implementing it again.

## Claim one issue

1. Change its status from `ready-for-agent` to `claimed`.
2. Save that change before editing code.
3. Work on one issue only. Do not begin a blocked or later issue.

If a blocker or missing decision appears, finish reachable work and set the appropriate canonical
status instead of weakening the issue.

## Implement

- Preserve every invariant in `spec.md`.
- Keep stage types and constructors inside `internal/semanticlint`.
- Use concrete stage interfaces before shared combinators.
- Keep the selected-evidence transition explicit.
- Remove the execution path replaced by the ticket; do not add compatibility shims.
- Add the narrowest behavioral `_test.go` and `testdata/` coverage.
- Update `docs/semantic-lint.md` only for user-visible behavior changes.

Do not optimize request count, tokens, latency, or price. Do not add a general `Plan[T]`, Monad,
`Bind`, callback DSL, or exported framework.

## Verify and resolve

1. Run the narrow semantic-lint test covering the changed behavior.
2. Run `./scripts/check.sh`.
3. Check every completed acceptance item in the issue.
4. Append an `## Answer` section containing:
   - the implemented symbols and files;
   - the preserved behavior or intentional change;
   - the exact verification commands and results.
5. Change the issue status to `resolved`.
6. Re-read the next issue before claiming it.

An issue is not resolved when code merely compiles. Its complete acceptance criteria and verification
must be recorded.

## Finish the epic

After issue 05 is resolved:

- verify every issue says `Status: resolved`;
- verify every checklist is complete;
- verify the completion criteria in `spec.md` against the code;
- append a short `## Outcome` to `spec.md` with the final interfaces and combinator decision;
- change the specification status to `resolved`;
- run `./scripts/check.sh` once more.
