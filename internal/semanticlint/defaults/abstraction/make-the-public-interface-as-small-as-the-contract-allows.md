---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Make the public interface as small as the contract allows

Apply this policy only to what this file exports; a file with no exports cannot violate it, and its imports are out of scope. Export what callers need and keep the steps that build it private. Report any of these shapes:

- an exported function that is only an intermediate step of another export, producing an earlier stage of the same kind of value, such as `export const itemText = (x: Item) => ...` beside `export const itemHeading = (x: Item) => itemText(x).toUpperCase()`. Report it even when other steps in the chain are already private;
- an export that only forwards to another, such as `export const label = (x: Item) => heading(x)`;
- an exported type, option, or member exposing a storage, transport, schema, or cache detail, such as `SqlItemRow` or a `cacheTableName` option.

Do not report a separate capability: an export returning a different kind of value that another export builds on (a computed number another export formats as text), a type used in an exported signature, or a caller-facing mode parameter.
