import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { fixturesRoot } from "./ruleTestFixturesRoot.js"
import { ruleNamed } from "./ruleNamed.js"

const preferMessage = (name: string) =>
  `Avoid wrapping the body of ${name} in Effect.gen; use Effect.fn. ` +
  "Use Effect.fn for the outer function and move the generator body out of Effect.gen. " +
  "Preserve any self/this binding on the Effect.fn call."

const serviceMessage =
  "Wrap public Effect service operations with a named Effect.fn. " +
  "Name the operation Domain.operation and keep the generator body focused on its workflow."

test("prefer-effect-fn reports marked violations and permits unmarked cases", () =>
  assertRuleFixture(ruleNamed("prefer-effect-fn")))

test("prefer-effect-fn owns Effect.gen wrappers without service rule overlap", async () => {
  const fixturePath = path.join(fixturesRoot, "prefer-effect-fn")
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules = [ruleNamed("prefer-effect-fn"), ruleNamed("service-method-effect-fn")]
  const violations = lint({ project, rules })
    .filter(({ filePath }) => filePath === "src/matrix.ts")
    .map(({ column, line, message, ruleName }) => ({ column, line, message, ruleName }))

  assert.deepEqual(violations, [
    {
      column: 7,
      line: 3,
      message: preferMessage("localZero"),
      ruleName: "prefer-effect-fn"
    },
    {
      column: 7,
      line: 8,
      message: preferMessage("localOne"),
      ruleName: "prefer-effect-fn"
    },
    {
      column: 14,
      line: 13,
      message: preferMessage("publicZero"),
      ruleName: "prefer-effect-fn"
    },
    {
      column: 14,
      line: 18,
      message: preferMessage("publicOne"),
      ruleName: "prefer-effect-fn"
    },
    {
      column: 14,
      line: 23,
      message: serviceMessage,
      ruleName: "service-method-effect-fn"
    },
    {
      column: 5,
      line: 30,
      message: preferMessage("generated"),
      ruleName: "prefer-effect-fn"
    },
    {
      column: 5,
      line: 35,
      message: serviceMessage,
      ruleName: "service-method-effect-fn"
    }
  ])
})
