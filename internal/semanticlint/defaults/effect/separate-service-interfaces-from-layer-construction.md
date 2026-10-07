---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Separate service interfaces from Layer construction

Apply this policy only to files that define a service capability/interface or construct its Layer. A file with neither a service definition nor a Layer cannot violate this rule, even if it performs provider I/O or validates a response.

Construct service implementations with Layers. Capture implementation dependencies when constructing the Layer, while keeping genuine per-operation requirements explicit in the operation's Effect type.
