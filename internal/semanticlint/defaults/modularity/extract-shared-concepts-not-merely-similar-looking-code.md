---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Extract shared concepts, not merely similar-looking code

Share an abstraction when its consumers need the same behavior for the same reason. Similar code that is likely to evolve differently can remain separate. Avoid `utils`, `common`, or `helpers` modules becoming dumping grounds for unrelated responsibilities.
