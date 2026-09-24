---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Abstract shared meaning, not merely similar code

Extract repeated logic when it expresses the same rule or responsibility, shares a contract, and should change together for the same reason. Similar-looking code likely to evolve differently may remain separate; do not force sharing through flags, special cases, or confusing parameters. Avoid `utils`, `common`, or `helpers` modules becoming dumping grounds for unrelated responsibilities.
