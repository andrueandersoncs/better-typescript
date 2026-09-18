---
globs:
  - "**/tsconfig*.json"
---
# Use strict runtime-specific TypeScript configuration files

Extend a shared base configuration that enables `strict` and `noUncheckedIndexedAccess`, and enable `exactOptionalPropertyTypes` wherever the project's dependencies are compatible. Use separate configurations for browser code, Bun server code, and runtime-neutral code. Scope runtime libraries and ambient types to their owning configuration; never expose Bun or Node types globally to browser or shared packages.
