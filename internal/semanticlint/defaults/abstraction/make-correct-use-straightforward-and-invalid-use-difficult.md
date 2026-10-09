---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make correct use straightforward and invalid use difficult

Report an API that permits an invalid state or operation and relies only on documentation or a caller remembering a rule to prevent it. Report any of these shapes:

- a hidden call order: an interface or class exposes separate steps valid only in a fixed sequence, such as `interface Job { init: () => void; run: () => void }`, where calling `run()` before `init()` type-checks. Parameterless `void` steps that set hidden state for a later step are the typical sign. Report it even when this file calls the steps in the right order;
- a `string` parameter for a fixed set of values, such as `createTask(status: string)`;
- a boolean argument that selects a dangerous mode, such as `send(user, true)`.

Do not report an API whose types or operations carry the invariant: one operation that performs the whole sequence, a first step returning the value the next requires (`init(): Ready`, `run(ready: Ready)`), a `Status` union, a validating constructor, or separate safe operations.
