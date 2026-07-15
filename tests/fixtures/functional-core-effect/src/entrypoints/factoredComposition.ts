import { Context, Layer } from "effect"

export class PrimaryConfig extends Context.Service<
  PrimaryConfig,
  { readonly value: string }
>()("PrimaryConfig") {}

export class SecondaryConfig extends Context.Service<
  SecondaryConfig,
  { readonly value: string }
>()("SecondaryConfig") {}

const makePrimaryLayer = () =>
  Layer.succeed(PrimaryConfig, { value: "primary" })

const makeSecondaryLayer = () =>
  Layer.succeed(SecondaryConfig, { value: "secondary" })

export const factoredLayer = Layer.merge(
  makePrimaryLayer(),
  makeSecondaryLayer()
)
