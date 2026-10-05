import * as Schema from "effect/Schema"

const RuntimeConfigSchema = Schema.Struct({
  port: Schema.Number,
  region: Schema.String
})

type RuntimeConfig = Schema.Schema.Type<typeof RuntimeConfigSchema>

const endpoint = (config: RuntimeConfig): string => `${config.region}:${config.port}`

export const readSettings = (raw: unknown): string => {
  const config = Schema.decodeUnknownSync(RuntimeConfigSchema)(raw)
  return endpoint(config)
}

export const runtimeFields = RuntimeConfigSchema
