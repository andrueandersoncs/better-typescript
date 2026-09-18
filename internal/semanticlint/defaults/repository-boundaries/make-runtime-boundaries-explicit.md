---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---
# Make runtime boundaries explicit

Classify every package and exported entry point as browser-safe, server-only, or tooling-only. Keep secrets, database clients, filesystem access, and Bun-only integrations outside browser dependency graphs. Shared contracts must not import server implementations. At transport seams, prefer standard `Request`, `Response`, `URL`, headers, and web streams when their semantics are sufficient; isolate runtime-specific extensions in adapters or application wiring. Apply the same runtime split between modules inside full-stack applications, not only between packages.
