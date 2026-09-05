# no-schema-decode-unknown-sync

## What it does

Reports calls to Effect's `Schema.decodeUnknownSync`, including calls through import aliases.

## When to use it

Use this rule when schema failures must stay in the Effect error channel.

## Conformant

```ts lint=clean
import { Schema } from "effect"

const User = Schema.Struct({ name: Schema.String })
declare const input: unknown

const decoded = Schema.decodeUnknownEffect(User)(input)
```

## Non-conformant

```ts lint=error:6:17
import { Schema } from "effect"

const User = Schema.Struct({ name: Schema.String })
declare const input: unknown

const decoded = Schema.decodeUnknownSync(User)(input)
```
