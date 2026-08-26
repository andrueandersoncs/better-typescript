# config-refined-values

## What it does

Reports `Config.string()` when its non-empty literal key case-insensitively ends in `path`, `dir`, `directory`, `folder`, `url`, `uri`, `host`, `hostname`, `endpoint`, `base_url`, `base-url`, `baseurl`, `port`, `id`, `uuid`, `identifier`, `slug`, or `email`. An ancestor call named `schema`, `mapOrFail`, `url`, `port`, `int`, or `boolean` suppresses the report.

## When to use it

Use this rule to validate structured configuration at the boundary with `Config.schema`, `Config.mapOrFail`, or a suitable typed Config constructor.

## Conformant

```ts
import { Config } from "effect"

const apiUrl = Config.url("api_url")
```

## Non-conformant

```ts
import { Config } from "effect"

const apiUrl = Config.string("api_url")
```
