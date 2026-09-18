---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Match code entities to the file name

Compare the basename of `code.filename` with every substantial top-level entity
defined in `code.source`, including functions, classes, types, and constants.
The filename must name the cohesive domain or responsibility shared by those
entities.

A file violates this rule when any substantial entity has a responsibility that
the filename does not represent. A related private helper is compliant when it
only supports the file's named responsibility. The filename need not repeat
each symbol literally; an established domain term or clear synonym is enough.

Generic filenames such as `index`, `main`, `utils`, `helpers`, `common`, or
`misc` do not represent unrelated implementation logic. An `index` or `main`
file is compliant only when it contains entrypoint wiring, composition, or
re-exports rather than substantive application behavior.

Examples:

- `user-service.ts` containing `createUser`, `updateUser`, and a private
  `normalizeEmail` helper is compliant.
- `invoice-calculator.ts` containing `createUser` is a violation.
- `user-service.ts` containing both `createUser` and `calculateInvoice` is a
  violation because the entities do not share the file's named responsibility.
- `index.ts` containing CLI parsing, rule loading, evaluation, and report
  formatting logic is a violation; moving that logic behind focused modules and
  leaving only entrypoint wiring would comply.
