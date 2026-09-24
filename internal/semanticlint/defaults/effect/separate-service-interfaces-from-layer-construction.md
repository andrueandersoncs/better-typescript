---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate service interfaces from Layer construction

Apply this policy only when the file defines an Effect service contract, constructs a Layer, or implements an Effect service. Do not report ordinary provider I/O when the file has no Effect service abstraction and constructs no Layer.

Define operations in terms of capabilities rather than vendor or database clients, and construct their implementations with Layers. Capture implementation dependencies when constructing the Layer, while keeping genuine per-operation requirements explicit in the operation's Effect type.

Report an Effect service implementation that is coupled directly to its vendor or database client instead of being constructed through a Layer.
