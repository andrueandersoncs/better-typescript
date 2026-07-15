Always do your work on the main branch unless explicitly instructed to create a branch. If you're already on another branch when work begins, do your work on that branch.

Always leave your changes uncomitted on the current branch unless explicitly instructed to commit them.

Always run the self-hosting Better TypeScript check (`npm run dev`) on the codebase itself after making any changes **and fix all violations that are reported**.

Always run the benchmark (`npm run bench`) after every code change, and require its measured report pass to remain below 100ms.

Always use @repos/effect/ (vendored effect repository) to find examples of correct Effect code.

Always do the complete work you're asked to do, do _not_ concern yourself with "churn".

Always double-check your work for consistency and simplicity.

Always double-check your work to make sure it **reduces or maintains** semantic complexity, never increases unless explicitly asked. If your work increases semantic complexity, always provide a justification.

Always write tests (in @tests) to verify the behavior of any code you write. These tests will be used in future changes to ensure no regressions are introduced.