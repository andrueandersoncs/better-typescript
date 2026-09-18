---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Optimize demonstrated bottlenecks, not imagined ones

Optimize only when before-and-after measurements or deterministic work counts show a bottleneck under a supported workload. Record the input scale, relevant resource budget, comparable environment, and evidence that baseline and candidate produce equivalent results.

Do not report code from slow-looking syntax alone, and do not accept an apparent improvement that skips required work or returns more errors. Keep a justified optimization local to the demonstrated constraint.
