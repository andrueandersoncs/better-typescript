import { Data } from "effect"

// EffectQualityIndex exists because its fields form one stable data contract used by the linter.
export class EffectQualityIndex extends Data.Class<{
  readonly isIdempotentOperationName: (operationName: string) => boolean
}> {}
