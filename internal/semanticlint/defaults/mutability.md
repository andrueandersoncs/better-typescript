---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep application state immutable

Do not use `let` or `var`, reassign bindings, mutate parameters, call mutating
array methods, mutate object fields, or retain mutable global state. Construct
new readonly values instead.

Creating local `const` values, importing readonly configuration, and performing
file, network, console, or process I/O at an isolated boundary are not mutations
of application state.