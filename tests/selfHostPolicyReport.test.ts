import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { defaultPolicyCatalog } from "@better-typescript/guidance/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"
import { EffectQualityAdviceData } from "@better-typescript/matchers/builtins/effectQuality/effectQualityAdviceData"
import { FunctionalCoreShapeData } from "@better-typescript/matchers/builtins/functionalCoreEffect/shapeData"
import {
  noImmediateEffectSync,
  noTrivialEffectFn,
  preferEffectSchemaConstructor
} from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { preferFunctionComposition } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { processEnvironment } from "@better-typescript/guidance/preset/errorHygienePolicies"
import selfHostConfig from "../better-typescript.config.js"
import { loadFixtureWorkspace } from "./reportLoadFixtureWorkspace.js"
import { reportFromTestWiring } from "./reportFromTestWiring.js"
import { testWiring } from "./reportTestWiring.js"
import { detectionsAt } from "./defaultDeriveDetections.js"
import { detectionAt } from "./architectureExploreDeriveDetectionAt.js"
import { reportedSignal } from "./defaultDeriveReportedSignal.js"
import { silentSignal } from "./defaultDeriveSilentSignal.js"
import { wrapperData } from "./architectureExploreDeriveWrapperData.js"

const productSelfHostWiring = selfHostConfig[0]!.wiring

const reportFor = async (policy: Policy) => {
  const workspace = await loadFixtureWorkspace(policy.name)
  const blocks = await Effect.runPromise(reportFromTestWiring(testWiring([policy]))(workspace))

  return blocks.join("\n")
}

const assertPublicReport = async (
  policy: Policy,
  location: RegExp,
  hint: RegExp,
  permittedPath: RegExp
) => {
  const report = await reportFor(policy)

  assert.match(report, new RegExp(`(?:^|\n)${policy.name}\n`))
  assert.match(report, location)
  assert.match(report, hint)
  assert.doesNotMatch(report, permittedPath)
}

test("self-host gap policies expose stable public reports", async () => {
  await assertPublicReport(
    preferEffectSchemaConstructor,
    /src\/cases\.ts:28:18/,
    /construct it through schema\.make/,
    /src\/allowed\.ts/
  )
  await assertPublicReport(
    noTrivialEffectFn,
    /src\/cases\.ts:5:14/,
    /Export the forwarded Effect operation directly/,
    /src\/allowed\.ts/
  )
  await assertPublicReport(
    processEnvironment,
    /src\/config\.ts:1:25/,
    /inject a ConfigProvider/,
    /src\/(?:main|config\.test|allowed)\.ts/
  )
  await assertPublicReport(
    preferFunctionComposition,
    /src\/cases\.ts:87:23/,
    /one data-last pipe/,
    /src\/allowed\.ts/
  )
  await assertPublicReport(
    noImmediateEffectSync,
    /src\/cases\.ts:4:1/,
    /retain the Effect only when it is deferred or composed/,
    /src\/allowed\.ts/
  )
})

test("self-host gap policies are enabled by default and during self-hosting", () => {
  const expected = Array.make(
    "prefer-effect-schema-constructor",
    "no-trivial-effect-fn",
    "process-environment",
    "prefer-function-composition",
    "no-immediate-effect-sync"
  )
  const defaultNames = Array.map(defaultPolicyCatalog, (policy) => policy.name)
  const selfHostNames = Array.map(productSelfHostWiring.policies, (policy) => policy.name)

  for (const name of expected) {
    assert.equal(defaultNames.includes(name), true, `${name} missing from defaults`)
    assert.equal(selfHostNames.includes(name), true, `${name} missing from self-hosting`)
  }
})

test("self-host derivation preserves every complete Wiring", () => {
  const defaultEvidence = reportedSignal("no-throw", detectionsAt("src/dense.ts", 10))
  const effectQualityEvidence = silentSignal("effect-quality-advice-evidence", [
    detectionAt(
      "src/config.ts",
      1,
      EffectQualityAdviceData.make({ kind: "config-refined-values", subject: "config path" })
    )
  ])
  const functionalCoreEvidence = silentSignal("functional-core-effect-shape-evidence", [
    detectionAt(
      "src/adapter.ts",
      1,
      FunctionalCoreShapeData.make({
        kind: "adapter-business-logic",
        role: "adapter",
        branchCount: 3,
        functionCount: 2,
        serviceCount: 0,
        effectfulMemberCount: 0,
        transformationCount: 0
      })
    )
  ])
  const architectureEvidence = silentSignal("pass-through-wrappers", [
    detectionAt("src/thin.ts", 1, wrapperData(1))
  ])
  const productAdvice = Effect.runSync(
    productSelfHostWiring.derive([defaultEvidence, functionalCoreEvidence, effectQualityEvidence])
  )
  const architectureAdvice = Effect.runSync(
    architectureExploreWiring.derive([architectureEvidence])
  )
  const titles = new Set([...productAdvice, ...architectureAdvice].map((advice) => advice.title))

  assert.ok(titles.has("high signal density"))
  assert.ok(titles.has("business logic in an adapter"))
  assert.ok(titles.has("refine configuration values"))
  assert.ok(titles.has("deletion-test shallowness"))
})
