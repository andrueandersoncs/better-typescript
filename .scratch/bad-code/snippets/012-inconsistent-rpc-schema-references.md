# Inconsistent RPC schema references

- ID: 012
- Added: 2026-09-08
- Source: paste
- Path: none

## Why it is bad

this is actually ALMOST PERFECT code, but the problem is that there are inconsistencies and missed patterns:

see how "payload" "success" and "error" are all provided differently in the different declarations? that's bad code. they should all follow similar syntactic patterns to reduce the cognitive burden.

## Code

```ts
const createBook = Rpc.make("books.create", {
  payload: BookSchema,
  success: BookResource.table.rowSchema,
  error: BookPersistenceError,
})

const getBook = Rpc.make("books.get", {
  payload: BookIdentifierInputSchema,
  success: BookResource.table.rowSchema,
  error: requiredBookErrorsSchema,
})

const listBooks = Rpc.make("books.list", {
  payload: ListBooksInputSchema,
  success: StoredBooksSchema,
  error: BookPersistenceError,
})

const updateBook = Rpc.make("books.update", {
  payload: BookResource.table.rowSchema,
  success: BookResource.table.rowSchema,
  error: requiredBookErrorsSchema,
})

const removeBook = Rpc.make("books.remove", {
  payload: BookIdentifierInputSchema,
  success: BookResource.table.rowSchema,
  error: requiredBookErrorsSchema,
})
```

## Analysis

### Shape: Inconsistent schema references in an RPC family

- Observable shape: Sibling `Rpc.make` calls under the `books.*` name prefix repeat `payload`, `success`, and `error`, but corresponding schema values vary between standalone identifiers, nested member paths, and inconsistent identifier naming forms.
- Existing rules: `schema-name-suffix` can require a `Schema` suffix on schema-valued `const` bindings, but it does not compare corresponding values across a declaration family; `no-property-access-after-call` does not apply because these member paths have no call receiver.
- Pattern: [inconsistent-sibling-schema-references](../patterns/inconsistent-sibling-schema-references.md)
- Emergence: new-prospective
- Reason: The family boundary, repeated slots, schema types, access-path shape, and identifier naming form are mechanically visible; the actionable replacement is to give each slot one reference convention across the family. One snippet is insufficient to confirm a default rule.
