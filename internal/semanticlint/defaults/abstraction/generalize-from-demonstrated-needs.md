---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Generalize from demonstrated needs

Design around real requirements and representative call sites. Do not add extension points, configuration options, or interchangeable implementations for imagined futures. A single consumer can still justify an abstraction that protects an important invariant or isolates a meaningful boundary.
