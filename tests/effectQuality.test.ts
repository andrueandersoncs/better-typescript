import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "bun:test"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { ruleNamed } from "./ruleNamed.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "effect-quality")
const rules = [
  "boundary-schema-decode",
  "bounded-retry-schedule",
  "cache-per-request",
  "cache-preference",
  "config-refined-values",
  "effect-fn-name",
  "effect-test-style",
  "global-config-mutation",
  "handrolled-ttl-cache",
  "http-client-preference",
  "http-response-validation",
  "http-status-decode-order",
  "idempotent-retry",
  "inflight-dedupe-map",
  "layer-forever-acquisition",
  "observable-worker-failure",
  "process-environment",
  "production-sleep-loops",
  "raw-fetch-abort-signal",
  "raw-fetch-outside-adapter",
  "retry-without-jitter",
  "schema-class-models",
  "schema-error-class",
  "schema-optional-key",
  "schema-record-interface",
  "scoped-background-work",
  "scoped-client-cache",
  "service-method-effect-fn",
  "stream-pagination",
  "test-clock-for-time",
  "test-sleeps",
  "typed-boundary-error",
  "typed-error-recovery",
  "typescript-namespaces",
  "unbounded-stream-buffer",
  "unbounded-stream-collect",
  "unsafe-casts"
].map(ruleNamed)
const expected = [
  "src/adapters/allowed.ts:4:http-client-preference",
  "src/adapters/http.ts:3:raw-fetch-abort-signal",
  "src/adapters/http.ts:3:service-method-effect-fn",
  "src/adapters/http.ts:4:http-client-preference",
  "src/adapters/http.ts:9:http-response-validation",
  "src/adapters/http.ts:9:http-status-decode-order",
  "src/application/rules.ts:101:service-method-effect-fn",
  "src/application/rules.ts:102:cache-per-request",
  "src/application/rules.ts:108:service-method-effect-fn",
  "src/application/rules.ts:111:scoped-client-cache",
  "src/application/rules.ts:113:bounded-retry-schedule",
  "src/application/rules.ts:113:retry-without-jitter",
  "src/application/rules.ts:113:service-method-effect-fn",
  "src/application/rules.ts:115:service-method-effect-fn",
  "src/application/rules.ts:116:typed-error-recovery",
  "src/application/rules.ts:119:typed-boundary-error",
  "src/application/rules.ts:11:schema-class-models",
  "src/application/rules.ts:11:schema-class-models",
  "src/application/rules.ts:125:bounded-retry-schedule",
  "src/application/rules.ts:125:service-method-effect-fn",
  "src/application/rules.ts:15:schema-record-interface",
  "src/application/rules.ts:16:schema-optional-key",
  "src/application/rules.ts:23:schema-record-interface",
  "src/application/rules.ts:24:schema-optional-key",
  "src/application/rules.ts:27:schema-error-class",
  "src/application/rules.ts:31:config-refined-values",
  "src/application/rules.ts:42:effect-fn-name",
  "src/application/rules.ts:42:service-method-effect-fn",
  "src/application/rules.ts:46:effect-fn-name",
  "src/application/rules.ts:50:process-environment",
  "src/application/rules.ts:51:raw-fetch-outside-adapter",
  "src/application/rules.ts:52:boundary-schema-decode",
  "src/application/rules.ts:55:raw-fetch-outside-adapter",
  "src/application/rules.ts:57:scoped-background-work",
  "src/application/rules.ts:58:idempotent-retry",
  "src/application/rules.ts:58:service-method-effect-fn",
  "src/application/rules.ts:59:observable-worker-failure",
  "src/application/rules.ts:59:service-method-effect-fn",
  "src/application/rules.ts:5:typescript-namespaces",
  "src/application/rules.ts:60:layer-forever-acquisition",
  "src/application/rules.ts:64:stream-pagination",
  "src/application/rules.ts:70:service-method-effect-fn",
  "src/application/rules.ts:73:service-method-effect-fn",
  "src/application/rules.ts:75:production-sleep-loops",
  "src/application/rules.ts:79:service-method-effect-fn",
  "src/application/rules.ts:79:unbounded-stream-collect",
  "src/application/rules.ts:80:unbounded-stream-buffer",
  "src/application/rules.ts:84:handrolled-ttl-cache",
  "src/application/rules.ts:93:cache-preference",
  "src/application/rules.ts:93:handrolled-ttl-cache",
  "src/application/rules.ts:99:handrolled-ttl-cache",
  "src/application/rules.ts:99:inflight-dedupe-map",
  "src/application/rules.ts:99:inflight-dedupe-map",
  "src/application/rules.ts:9:unsafe-casts",
  "tests/effect.spec.ts:4:global-config-mutation",
  "tests/effect.spec.ts:6:effect-test-style",
  "tests/effect.spec.ts:6:test-clock-for-time",
  "tests/effect.spec.ts:6:test-sleeps",
  "tests/effect.spec.ts:8:effect-test-style"
]

test("Effect Quality rules preserve selected recognition and adapter boundary behavior", async () => {
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const violations = lint({ project, rules })
  const actual = violations
    .map((violation) => `${violation.filePath}:${violation.line}:${violation.ruleName}`)
    .sort()
  const rawFetchViolations = violations.filter(
    (violation) => violation.ruleName === "raw-fetch-outside-adapter"
  )

  assert.deepEqual(actual, expected)
  assert.equal(
    rawFetchViolations.some((violation) => violation.filePath.includes("adapters/")),
    false
  )
  assert.equal(
    rawFetchViolations.some((violation) => violation.filePath.includes("application/")),
    true
  )
  assert.equal(
    violations.some((violation) => violation.filePath.includes("application/allowed")),
    false
  )
})
