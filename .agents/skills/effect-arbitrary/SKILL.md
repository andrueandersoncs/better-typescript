---
name: effect-arbitrary
description: This skill should be used when the user asks to "generate arbitrary values", "generate sample data from a schema", "use Effect Arbitrary", "Schema.toArbitrary", or to produce Effect Schema test data, fixtures, or FastCheck samples.
compatibility: Requires `@andrue/cli` and Effect v4 (effect@rc).
---

# Effect Arbitrary

Generate values from an Effect Schema.

```ts
import { Schema } from "effect"
import { FastCheck } from "effect/testing"

const samples = FastCheck.sample(Schema.toArbitrary(schema)(FastCheck), 10)
```

Default-export the schema from a module. Run the CLI:

```sh
andrue-cli generate <schema-module> --count 10
```
