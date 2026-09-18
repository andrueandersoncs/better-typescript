---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
  - "**/package.json"
  - "**/tsconfig*.json"
---
# Create packages only for meaningful boundaries

Create a package only when it has consumers, distinct runtime needs, independent ownership, or a meaningful dependency boundary. Start ordinary features as folders. Do not create one package per service or vague `shared`, `common`, or `utils` packages.
