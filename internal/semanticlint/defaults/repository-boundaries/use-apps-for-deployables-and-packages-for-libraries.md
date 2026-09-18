---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---
# Use apps for deployables and packages for libraries

Place deployable applications in `apps/` and reusable libraries in `packages/`. Packages must never import code from an app, and an app must never import another app's internals. Full-stack server code may remain inside its web app when it has no separate deployment.
