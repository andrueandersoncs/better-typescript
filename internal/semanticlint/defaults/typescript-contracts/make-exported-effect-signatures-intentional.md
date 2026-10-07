---
globs:
  - "**/*.{ts,tsx}"
---
# Make exported Effect signatures intentional

Review the success, error, and requirement channels of every public Effect. Declare explicit signatures at exported boundaries and prefer inference within implementations.
