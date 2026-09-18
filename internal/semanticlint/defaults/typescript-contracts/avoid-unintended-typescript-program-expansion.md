---
globs:
  - "**/*.{ts,tsx}"
  - "**/tsconfig*.json"
  - "**/package.json"
---
# Avoid unintended TypeScript program expansion

TypeScript configuration, imports, dependencies, and ambient declarations must not pull generated outputs, unrelated workspaces, test environments, or extra runtime globals into a production compiler program without an explicit need.

Do not infer program membership from globs alone. Report only when compiler file-explanation evidence shows that the changed path unintentionally expands the program.
