# duplicate-shape

## What it does

Groups project interfaces and type aliases by normalized source shape. For each shape, the lexicographically smallest `filename:name` key is silent; a matching declaration reports only when its key differs from that selected key. Declarations sharing the selected key are also silent. For an interface, it discards all text before the first `{`, including heritage and generic headers. Alias RHS types are not resolved. Normalization removes whitespace and every lowercase `readonly` substring, and ignores the order of semicolon-separated object members, union members, and intersection members.

## When to use it

Use this rule to reuse shared data structures instead of creating parallel names for the same shape. Keep a separate representation only when it has its own boundary or invariant.

## Conformant

```ts
interface UserRecord {
  id: string
}

interface AuditRecord {
  createdAt: number
}
```

## Non-conformant

```ts
interface UserRecord {
  id: string
}

interface UserRow {
  id: string
}
```
