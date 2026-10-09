---
globs:
  - "**/*.{ts,tsx}"
---
# Preserve meaningful distinctions until the boundary

Report code that collapses meaningful identifiers, timestamps, units, or validated distinctions before a boundary requires another representation. Examples: converting `UserId` and `OrderId` to `string`, reducing a `Timestamp` or `Duration` to an unlabelled `number`, or replacing a decoded discriminated union with `string` while domain code still uses it. Do not report a conversion at a boundary that requires another representation, or code that preserves the distinction.
