Always keep your output **extremely simple and concise** regardless of what type of output it is,
whether it is a direct response, documentation, code changes, or anything else, unless explicitly
asked to disregard this rule. Brevity and simplicity are more important than anything else unless
explicitly instructed otherwise.

Always do your work on the main branch unless explicitly instructed to create a branch. If you're
already on another branch when work begins, do your work on that branch.

Always leave your changes uncomitted on the current branch unless explicitly instructed to commit
them.

Always run the self-hosting Better TypeScript check (`bun run dev`) on the codebase itself after
making any changes and fix every reported Violation until the result is empty.

Always enable every built-in Rule for self-hosting across `core`, `rules`, and `cli`. Self-hosting
is the dogfooding gate for the complete built-in catalog.

Always run the whole-process benchmark (`bun run bench:self`) after every code change (.ts or .tsx
files only) and report its minimum, median, and maximum runtime.

Always run the prettier formatter (`bun run format`) after every code change (.ts or .tsx files
only) and include the formatting in your commit.

You **do not** need to run `bun run bench:self`, `bun run dev`, or `bun run format:check` for
non-code changes.

Always use repos/effect/ (vendored effect repository) to find examples of correct Effect code.

Always do the complete work you're asked to do, do _not_ concern yourself with "churn".

Always implement the **correct solution** to a problem regardless of how long you think it might
take. Your estimate of time and complexity is significantly skewed by your training data and you
tend to **over-estimate** how long something will take and you tend to **under-estimate** your own
capabilities.

Always do **exactly** the work you're asked to do. If the magnitude of the work is large, decompose
it into independent tasks and delegate to subagents.

Always **manually do the work** unless it is a mechanical change that can be **trivially**
accomplished with a script. Your first instinct should be to do the work yourself. Your second
instinct should be to decompose the work into independent tasks and delegate to subagents.

Always double-check your work for consistency and simplicity.

Always double-check your work to make sure it **reduces or maintains** semantic complexity, never
increases unless explicitly asked. If your work increases semantic complexity, always provide a
justification.

Always write tests (in @tests) to verify the behavior of any code you write. These tests will be
used in future changes to ensure no regressions are introduced.

Always check the @skills/ (not .agents/skills/) when you make changes to see if they need to be
updated.

## Agent skills

### Issue tracker

Issues and specs are tracked as local Markdown under `.scratch/`. See
`docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage role names unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Use the single-context domain layout. See `docs/agents/domain.md`.
