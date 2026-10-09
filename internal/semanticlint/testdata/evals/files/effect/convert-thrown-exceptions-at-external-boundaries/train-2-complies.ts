import { Data, Effect, Schema } from "effect"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "yaml"

export class ConfigUnreadable extends Data.TaggedError("ConfigUnreadable")<{
  readonly path: string
  readonly cause: unknown
}> {}

const TenantConfig = Schema.Struct({
  tenantId: Schema.String,
  region: Schema.Literal("us", "eu"),
  seats: Schema.Number,
})
export type TenantConfig = typeof TenantConfig.Type

export const configPath = (root: string, tenantId: string): string =>
  join(root, "tenants", `${tenantId}.yaml`)

export const loadTenantConfig = (root: string, tenantId: string) =>
  Effect.gen(function* () {
    const path = configPath(root, tenantId)
    const text = yield* Effect.try({
      try: () => readFileSync(path, "utf8"),
      catch: (cause) => new ConfigUnreadable({ path, cause }),
    })
    const raw: unknown = yield* Effect.try({
      try: () => parse(text),
      catch: (cause) => new ConfigUnreadable({ path, cause }),
    })
    const config = yield* Schema.decodeUnknown(TenantConfig)(raw)
    yield* Effect.logDebug(`loaded config for ${config.tenantId}`)
    return config
  })
