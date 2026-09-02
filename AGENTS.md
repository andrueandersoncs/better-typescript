Always keep output and repository text extremely simple and concise unless asked otherwise.

Work on the current branch. Leave changes uncommitted unless asked to commit.

For repository changes, run:

```sh
./scripts/check.sh
```

Add the narrowest `_test.go` and `testdata/` coverage for changed behavior.

Keep the rule catalog complete, unique, and sorted. Each rule belongs in one `internal/rules/<rule_name>/` package. Keep rule-specific helpers there.

After every rule addition or behavior change, update the public docs in `docs/rules.md` and `docs/rules/<rule-name>.md`.

Use the pinned public `typescript-go` AST and checker adapters directly. Preserve one listener registration and one AST traversal per file.

For compiler dependency updates, read `docs/compiler-foundation.md` and run `./scripts/update-typescript-go.sh <version>`.

Check `skills/` after behavior changes.

Issues and specs are local Markdown under `.scratch/`; see `docs/agents/issue-tracker.md`. Use the canonical triage labels in `docs/agents/triage-labels.md`. Use the domain layout in `docs/agents/domain.md`.

Always use ShadCN and TailwindCSS in any web app front end.

Follow the advice from the software-laws skill as closely as you can, in general. Cite them frequently in your work.

Golden Rule: Always produce the **simplest**, most **direct**, most **concise**, most **correct**, and most **complete** output possible, regardless of the task.

Avoid complexity at all costs, except where it conflicts with the Golden Rule.

Maintain simplicity at all costs, except where it conflicts with the Golden Rule.

Follow the campsite rule with every change you make: leave the codebase cleaner than you found it.
