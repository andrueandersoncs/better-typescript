import { Data, Function } from "effect"
import {
  conventionalArchitectureRoleOf,
  type ArchitectureRoleClassifier
} from "../../support/architectureRole.js"

export type EffectQualityRawFetchException = (projectRelativePath: string) => boolean

export type EffectQualityIdempotency = (operationName: string) => boolean

const noRawFetchException: EffectQualityRawFetchException = Function.constant(false)

const idempotentOperationName: EffectQualityIdempotency = (operationName) =>
  /^(get|list|find|read|lookup|fetch|resolve|load|query|check)/i.test(operationName)

// EffectQualityPolicy is shared policy config because wiring and matchers need one record.
export class EffectQualityPolicy extends Data.Class<{
  readonly roleOf: ArchitectureRoleClassifier
  readonly rawFetchException: EffectQualityRawFetchException
  readonly idempotentOperation: EffectQualityIdempotency
  readonly sensitiveConfigKey: (key: string) => boolean
}> {}

export const defaultEffectQualityPolicy = new EffectQualityPolicy({
  roleOf: conventionalArchitectureRoleOf,
  rawFetchException: noRawFetchException,
  idempotentOperation: idempotentOperationName,
  sensitiveConfigKey: (key) => /(?:api[_-]?key|token|secret|password|credential)/i.test(key)
})
