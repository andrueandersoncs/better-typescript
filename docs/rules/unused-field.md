# unused-field

## What it does

Checks fields in interfaces and non-function, non-constructor, non-union type aliases. Reports a field when its checker symbol has no non-declaration identifier use; writes and the exact forwarding shape `{ field: value.field }` count as uses. A textual `Struct.get("field")` call counts that field name program-wide. Interfaces derived from Effect's `Schema.Schema.Type` are allowed because their fields are consumed by schema validation and encoding. All fields of an exported interface or type alias are allowed when that type symbol is referenced inside an exported function declaration or exported variable statement. Methods and built-in support fields are ignored.

## When to use it

Use it to remove speculative domain fields that no behavior reads.

## Conformant

```ts
interface PublishedDraft {
  readonly title: string
}

export const publishedDraftTitle = (draft: PublishedDraft): string => draft.title

interface Action {
  readonly outcome: string
}

const applyInit = (action: Action) => ({ outcome: action.outcome })
```

## Non-conformant

```ts
interface Draft {
  readonly title: string
  readonly forecast: number
}

export const draftTitle = (draft: Draft): string => draft.title
```
