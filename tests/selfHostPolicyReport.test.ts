import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { defaultPolicyCatalog } from "@better-typescript/guidance/preset/defaultWiring"
import {
  noImmediateEffectSync,
  noTrivialEffectFn,
  preferEffectSchemaConstructor
} from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { preferFunctionComposition } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { processEnvironment } from "@better-typescript/guidance/preset/errorHygienePolicies"
import { standardSelfHostWiring } from "../selfHostWiring.js"
import { loadFixtureWorkspace } from "./reportLoadFixtureWorkspace.js"
import { reportFromTestWiring } from "./reportFromTestWiring.js"
import { testWiring } from "./reportTestWiring.js"

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
  const selfHostNames = Array.map(standardSelfHostWiring.policies, (policy) => policy.name)

  for (const name of expected) {
    assert.equal(defaultNames.includes(name), true, `${name} missing from defaults`)
    assert.equal(selfHostNames.includes(name), true, `${name} missing from self-hosting`)
  }
})
