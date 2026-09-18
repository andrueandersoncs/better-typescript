---
globs:
  - "package.json"
  - "bun.lock"
  - "bunfig.toml"
  - ".github/**/*.{yml,yaml}"
---
# Use one pinned Bun toolchain and root lockfile

Use Bun as the repository's only package manager, commit one `bun.lock` at the repository root, and do not commit competing package-manager lockfiles. Pin one explicit Bun version for both local development and CI, and run CI installs with the frozen lockfile.
