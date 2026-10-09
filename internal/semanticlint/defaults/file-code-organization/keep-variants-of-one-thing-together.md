---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Keep variants of one thing together

Apply this policy to files that declare two or more variants of one thing: overloads of one function, functions that each produce or handle one member of the same union or state type, routes of one router, or tests of one function. Variants share a role, such as the same union return type; declarations that merely take the same parameter type and each compute something different are not variants.

Keep all variants of one thing in one contiguous run. Report a file where any unrelated declaration sits between two variants, even a single short declaration in a small file:

- `export const itemOpened = (item: Item): ItemStatus => "opened"`, then `export const itemLabel = (item: Item): string => ...`, then `export const itemClosed = (item: Item): ItemStatus => "closed"`;
- overload signatures of `lookup` separated by another function;
- tests of `parse` split around tests of something else.

Do not report a file whose variants are already adjacent, even when unrelated declarations come before or after the group, or a file with no variants.
