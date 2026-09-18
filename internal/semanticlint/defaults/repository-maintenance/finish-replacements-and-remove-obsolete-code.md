---
globs:
  - "**/*"
---
# Finish replacements and remove obsolete code

When replacing an implementation, remove the old implementation and its exports, dependencies, configuration, and documentation. Keep unrelated reorganization out of the feature change. Use consistent filenames and named exports, and split files only at coherent responsibility boundaries—not at arbitrary length limits.
