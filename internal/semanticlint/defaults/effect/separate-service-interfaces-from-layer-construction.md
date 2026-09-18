---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate service interfaces from Layer construction

Define operations in terms of capabilities rather than vendor or database clients, and construct their implementations with Layers. Capture implementation dependencies when constructing the Layer, while keeping genuine per-operation requirements explicit in the operation's Effect type.
