---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep application state immutable

Do not use `let` or `var`, reassign bindings, mutate parameters, call mutating
array methods, mutate object fields, or retain mutable global state. Construct
new readonly values instead. A function-local builder is permitted only where
project configuration explicitly excludes `no-mutation` and, for mutating array
methods, `no-mutable-array-methods`; do not expose its mutable state.

Creating local `const` values, importing readonly configuration, and performing
file, network, console, or process I/O at an isolated boundary are not mutations
of application state.