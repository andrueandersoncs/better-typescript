---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not require a secret call order

Report an API whose operation only works after another call when nothing in the types enforces that order. For example, report an interface with `connect(): void` and `send(message: string): void` where `send` needs a prior `connect`, even if every caller in the file calls them in the right order; infer the dependency from member names and fixed call order. Do not report independent operations, a single operation, or an order the types enforce, such as `connect(): Connection` where only `Connection` has `send`.
