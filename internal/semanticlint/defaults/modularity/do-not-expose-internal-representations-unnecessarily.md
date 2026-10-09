---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Do not expose internal representations unnecessarily

Apply this policy to what exported functions and interfaces return; taking an internal record as input and mapping it to another shape is not exposure. Report any of these shapes:

- an exported function that returns the module's stored record type as-is (a `Row`, `Record`, or `Entity` type, often not itself exported) when the record carries fields its callers do not need, such as `export const findAccount = (): AccountRecord => record` where `AccountRecord` holds `passwordHash` or `internalMarginCents` beside `id` and `name`;
- a return that passes the whole record through, such as `{ ...row }`;
- an interface method returning `UserRow` when callers only need `UserSummary`.

Do not report a function that maps the record into a narrower caller-facing type, such as `(): AccountSummary => ({ id: record.id, name: record.name })`, a mapper or test that turns a row into a payload, or a storage-shaped return whose every field fits the caller's task.
