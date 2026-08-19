import * as assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
const expected = readFileSync(path.join(fixturePath, "violations.json"), "utf8").trimEnd()

test("every Effect Quality rule has exact public Violation output", async () => {
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const actual = rules.map((rule) => [rule.name, lint({ project, rules: [rule] })])

  assert.equal(JSON.stringify(actual, null, 2), expected)
})
