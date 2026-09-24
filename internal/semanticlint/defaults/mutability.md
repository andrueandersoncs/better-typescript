---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep application state immutable

Do not use `let` or `var`, reassign bindings, mutate parameters, call mutating array methods, mutate object fields, or retain mutable global state. Construct new readonly values instead.

A non-escaping, locally owned builder may mutate during construction when intermediate identities are unobservable and the returned result does not expose mutable state.

Do not report mutation confined to a non-escaping request-local builder. Report mutation that escapes the builder, changes shared state, mutates an input parameter, or exposes mutable state in the returned value.

Creating local `const` values, importing readonly configuration, and performing
file, network, console, or process I/O at an isolated boundary are not mutations
of application state.