---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate decision-making from external effects

Where practical, keep calculations, validation, and business decisions separate from database access, network calls, file operations, and time retrieval, so rules can be tested without recreating the outside world. Do not add layers around trivial operations solely for this separation.
