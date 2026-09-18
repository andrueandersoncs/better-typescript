---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate decision-making from external effects

Keep calculations, validation, and business decisions separate from database access, network calls, file operations, and time retrieval where practical. This lets you test the rules without recreating the outside world.
