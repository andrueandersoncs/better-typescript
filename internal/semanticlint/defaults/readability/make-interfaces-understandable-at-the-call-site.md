---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make interfaces understandable at the call site

Report an interface whose parameters or return value cannot be understood at the call site, such as `resize(image, 300, 200, 90)` or a bare `string` return whose representation is unclear. Use named arguments or descriptive options when they clarify intent. Do not report calls whose argument roles and return value are clear where written. Arguments that switch one operation between modes are out of scope; `do-not-force-variation-through-flags` covers them.
