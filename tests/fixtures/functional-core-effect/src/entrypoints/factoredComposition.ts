import { Context, Layer } from "effect"

export class PrimaryConfig extends Context.Tag("PrimaryConfig")<
  PrimaryConfig,
  { readonly value: string }
>() {}

export class SecondaryConfig extends Context.Tag("SecondaryConfig")<
  SecondaryConfig,
  { readonly value: string }
>() {}

const makePrimaryLayer = () =>
  Layer.succeed(PrimaryConfig, { value: "primary" })

const makeSecondaryLayer = () =>
  Layer.succeed(SecondaryConfig, { value: "secondary" })

export const factoredLayer = Layer.merge(
  makePrimaryLayer(),
  makeSecondaryLayer()
)
