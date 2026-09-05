# config-refined-values

## What it does

Reports direct calls to Effect v4's `Config.String()` when their non-empty literal key case-insensitively ends in `path`, `dir`, `directory`, `folder`, `url`, `uri`, `host`, `hostname`, `endpoint`, `base_url`, `base-url`, `baseurl`, `port`, `id`, `uuid`, `identifier`, `slug`, or `email`.

It resolves the `Config.String` declaration, so aliases are checked and unrelated same-named calls are not. An immediate `Config.map` composition is accepted only when its one value is passed directly to a resolved Schema `make` call. An immediate `Config.mapEffect` composition is accepted only when that value invokes a resolved Schema decoder and returns it through Effect's resolved `mapError` adapter; replacing it with another Effect is not refinement.

## When to use it

Use a constructor that decodes the same configuration value, such as `Config.URL`, or `Config.schema` with an appropriate Schema.

## Conformant

```ts
import { Config } from "effect"

const apiUrl = Config.URL("api_url")
```

## Non-conformant

```ts
import { Config } from "effect"

const apiUrl = Config.String("api_url")
```
