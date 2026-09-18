---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make failure behavior explicit

Handle errors where useful action can be taken, preserve relevant context, and write messages that explain what failed. Do not silently swallow failures or return success-shaped defaults unless that behavior is intentional and clear.
