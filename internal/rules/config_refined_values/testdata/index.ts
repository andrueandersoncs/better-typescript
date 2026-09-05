import { Config, Effect, Schema } from "effect"
import { Config as EffectConfig } from "effect"

declare const unrelated: { schema(value: unknown): unknown }

Config.String("api_url")
unrelated.schema(Config.String("api_url"))
EffectConfig.String("api_url")
Config.URL("api_url")
Config.schema(Schema.URL, "api_url")
Config.String("label")

Config.String("api_url").pipe(
  Config.mapEffect((value) =>
    Schema.decodeUnknownEffect(Schema.URLFromString)(value).pipe(
      Effect.mapError((error: Schema.SchemaError) => new Config.ConfigError(error))
    )
  )
)

Config.String("api_url").pipe(
  Config.mapEffect((value) =>
    Schema.decodeUnknownEffect(Schema.URLFromString)(value).pipe(
      () => Effect.succeed(value)
    )
  )
)

const OtherConfig = { String: (name: string) => name }
OtherConfig.String("api_url")
