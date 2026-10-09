---
globs:
  - "**/*.{ts,tsx}"
---
# Preserve meaningful distinctions until the boundary

Apply this policy to code that maps identifiers, timestamps, units, or validated values between representations, including mapping helpers defined in tests. A file with no such mapping cannot violate this rule.

Carry each value through domain mapping unchanged, and convert its form only where a boundary requires it, as in `{ id: record.id, createdAt: new Date(record.created_at) }` and later `createdAt.toISOString()` in an outgoing payload. Report any of these shapes:

- rewriting identifier text while mapping, such as `id: record.id.toLowerCase()`, `.toUpperCase()`, `.trim()`, a `.replace(...)`, or stripping a prefix, which can merge distinct identifiers or break round-trips;
- widening distinct identifier types to a shared `string`, such as passing a `UserId` and an `OrderId` as plain `string` in domain code;
- reducing a timestamp, duration, or amount to an unlabelled `number` or truncating its precision or unit, such as `date.getTime()` or `Math.round(amount)` inside domain code;
- replacing a decoded discriminated union or validated type with `string` while domain code still uses it.

Do not report a conversion at a boundary that requires another representation, such as `toISOString()` or `String(id)` when building a response, row, or payload, as long as the value itself is not altered.
