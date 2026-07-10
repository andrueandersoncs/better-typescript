Always do your work on the main branch unless explicitly instructed to create a branch. If you're already on another branch when work begins, it's fine to commit to that branch.
Always leave your changes uncomitted on the current branch unless explicitly instructed to commit them
Always read the check modules in `src/checks/` (each module's emitted message/hint states the check) before writing TypeScript; verify with a bounded run (`timeout 10 npm run dev`) and keep the initial report at `No signals`.
Always run the self-hosting Better TypeScript check (`timeout 10 npm run dev`) on the codebase itself after making any changes
Always use @repos/effect/ (vendored effect repository) to find examples of correct Effect code
Always do the complete work you're asked to do, do _not_ concern yourself with "churn"
Always prioritize consistency and simplicity when possible
Always aim to reduce complexity with every change you make
