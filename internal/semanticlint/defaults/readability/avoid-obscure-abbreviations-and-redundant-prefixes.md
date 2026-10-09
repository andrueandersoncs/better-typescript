---
globs:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---
# Avoid obscure abbreviations and redundant prefixes

Apply this policy to identifiers the file declares: variables, parameters, functions, fields, and types. Names imported from elsewhere or fixed by an external API are out of scope.

Spell words out unless the short form is universally familiar. Report the file when any declared name has one of these shapes, even if it is used only locally:

- a vowel-dropped or truncated word, or a compound of them, such as `usr`, `cfg`, `pmtRec`, or `ordItms` instead of `user`, `config`, `paymentRecord`, or `orderItems`;
- a prefix or suffix that repeats what the type or enclosing scope already says, such as a parameter `invInvoice: Invoice`, a field `userUserId` on a user, or `order_order_id`;
- a type tag in the name, such as `strTitle` or `arrLines`.

Do not report universally familiar short forms such as `i` in a small loop, `id`, `url`, `api`, `db`, `fs`, `sql`, `err`, or `ctx`; a qualifier that distinguishes a field from another meaning, such as `errorCode` on an error type; or a full-word name that is merely generic, such as `data` or `handle`, which is a naming-by-purpose concern rather than an abbreviation.
