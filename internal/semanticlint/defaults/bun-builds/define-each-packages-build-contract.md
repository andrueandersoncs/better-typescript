---
globs:
  - "**/{package.json,tsconfig*.json}"
---
# Define each package's build contract

Define whether each package's consumers load TypeScript source or built JavaScript and declaration files, and make its exports and build output match that choice. Verify package resolution through the production consumption path rather than only through development aliases or source shortcuts, and use TypeScript project references only when the packages form a real project build graph.
