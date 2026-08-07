import { Function } from "effect"

import { conventionalArchitectureRoleOf } from "../../support/conventionalArchitectureRoleOf.js"

import type { EffectQualityIdempotency } from "./effectQualityIdempotency.js"

import { EffectQualityPolicy } from "./effectQualityPolicy.js"

import type { EffectQualityRawFetchException } from "./effectQualityRawFetchException.js"

const noRawFetchException: EffectQualityRawFetchException = Function.constant(false)

const idempotentOperationName: EffectQualityIdempotency = (operationName) =>
  /^(get|list|find|read|lookup|fetch|resolve|load|query|check)/i.test(operationName)

export const defaultEffectQualityPolicy = new EffectQualityPolicy({
  roleOf: conventionalArchitectureRoleOf,
  rawFetchException: noRawFetchException,
  idempotentOperation: idempotentOperationName,
  sensitiveConfigKey: (key) => /(?:api[_-]?key|token|secret|password|credential)/i.test(key)
})
