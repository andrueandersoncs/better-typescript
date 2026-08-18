import { Data } from "effect"

export const EffectDataClass = Data.Class<{
  readonly protocol: boolean
  readonly runtimeSchema: boolean
  readonly errorLike: boolean
}>
