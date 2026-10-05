import * as Schema from "effect/Schema"

const RuntimeConfigSchema = Schema.Struct({
  port: Schema.Number,
  region: Schema.String
})

type RuntimeConfig = {
  readonly port: number
  readonly region: string
}

const endpoint = (config: RuntimeConfig): string => `${config.region}:${config.port}`

export const readSettings = (raw: unknown): string => {
  const config = raw as RuntimeConfig
  return endpoint(config)
}

export const runtimeFields = RuntimeConfigSchema
