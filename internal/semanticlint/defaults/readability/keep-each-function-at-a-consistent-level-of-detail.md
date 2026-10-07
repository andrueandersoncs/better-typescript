---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep each function at a consistent level of detail

Avoid mixing high-level workflow with low-level implementation details in one function or in one abstraction's public operations. A function that coordinates checkout should not also contain the details of parsing a payment response.
