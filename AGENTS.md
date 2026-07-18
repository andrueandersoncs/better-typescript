Always start a task by creating a precise definition for the top 5 most relevant, most important
concepts, entities, or aspects. For example, if your task includes creating a new check in
better-typescript (this project), two of the most relevant concepts would be:

1. What, precisely, is `better-typescript`?
2. What, precisely, is the new check?

Always do your work on the main branch unless explicitly instructed to create a branch. If you're
already on another branch when work begins, do your work on that branch.

Always leave your changes uncomitted on the current branch unless explicitly instructed to commit
them.

Always run the self-hosting Better TypeScript check (`npm run dev`) on the codebase itself after
making any changes **and fix all violations that are reported**. This includes Advice blocks: follow
each block's remediation until the report is empty. Architecture advice is not informational output
— it is a failing gate.

Always make sure **all checks, advice, rules, and so on** are configured to be **enabled for the
self-hosted tooling**, this includes **all newly-implemented checks, advice, wiring, etc**, and this
applies to **all packages in this project** including `checks`, `core`, AND `cli`. Self-hosting is
intended to be a form of dogfooding where every check, advice, etc, we implement is applied to this
project such that we're following our own advice and dogfooding our own tooling.

Always run the benchmark (`npm run bench`) after every code change, and require its measured report
pass to remain below 100ms.

Always run the prettier formatter (`npm run format`) after every code change and include the
formatting in your commit.

Always use @repos/effect/ (vendored effect repository) to find examples of correct Effect code.

Always do the complete work you're asked to do, do _not_ concern yourself with "churn".

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
