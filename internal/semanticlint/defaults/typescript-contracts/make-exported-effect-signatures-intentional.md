---
globs:
  - "**/*.{ts,tsx}"
---
# Make exported Effect signatures intentional

Review the success, error, and requirement channels of every public Effect. Declare explicit signatures at exported boundaries and prefer inference within implementations. Do not use unexplained `any`, non-null assertions, or double casts. When unsafe interop is unavoidable, isolate it behind the smallest named boundary and test that boundary's behavior.
