import { Data } from "effect"

import type { ArchitectureRoleClassifier } from "../../support/architectureRoleClassifier.js"

import type { EffectQualityIdempotency } from "./effectQualityIdempotency.js"

import type { EffectQualityRawFetchException } from "./effectQualityRawFetchException.js"

// EffectQualityPolicy is shared policy config because wiring and matchers need one record.
export class EffectQualityPolicy extends Data.Class<{
  readonly roleOf: ArchitectureRoleClassifier
  readonly rawFetchException: EffectQualityRawFetchException
  readonly idempotentOperation: EffectQualityIdempotency
  readonly sensitiveConfigKey: (key: string) => boolean
}> {}
