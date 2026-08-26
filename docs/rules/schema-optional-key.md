# schema-optional-key

## What it does

Reports `Schema.optional(...)` on an object property when the file also has an optional property signature with the same name and its type does not contain `undefined`. The match is file-wide and uses the property name; it does not prove that the interface and schema correspond.

The exact report is: `Use Schema.optionalKey for absent fields unless undefined is contractual. Use optionalKey for absent JSON keys; reserve optional for explicit undefined.` Explicit `undefined` is allowed. Computed string and numeric literal names are resolved, so they can match and report. Only non-literal or otherwise unresolvable computed names are allowed.

## When to use it

Use it to distinguish an absent serialized key from a key whose value may explicitly be `undefined`.

## Conformant

```ts
import { Schema } from "effect"

interface User { nickname?: string }
const User = Schema.Struct({ nickname: Schema.optionalKey(Schema.String) })

interface Contractual { alias?: string | undefined }
const Contractual = Schema.Struct({ alias: Schema.optional(Schema.String) })
```

## Non-conformant

```ts
import { Schema } from "effect"

interface User { nickname?: string }
const User = Schema.Struct({ nickname: Schema.optional(Schema.String) })
```
