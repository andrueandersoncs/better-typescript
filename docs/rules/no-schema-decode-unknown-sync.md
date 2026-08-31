# no-schema-decode-unknown-sync

## What it does

Reports calls to Effect's `Schema.decodeUnknownSync`, including calls through import aliases.

## When to use it

Use this rule when schema failures must stay in the Effect error channel.

## Conformant

```ts
import { Schema } from "effect"

const decodeUser = Schema.decodeUnknown(User)
```

## Non-conformant

```ts
import { Schema } from "effect"

const decodeUser = Schema.decodeUnknownSync(User)
```
