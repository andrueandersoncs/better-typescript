---
globs:
  - "package.json"
  - "bun.lock"
  - "bunfig.toml"
---
# Choose the install linker deliberately

Set Bun's install linker explicitly and prefer isolated installs. Keep separate checks for undeclared dependencies and invalid imports because isolated linking does not fully enforce those boundaries, and document any compatibility exception that requires a different linker.
