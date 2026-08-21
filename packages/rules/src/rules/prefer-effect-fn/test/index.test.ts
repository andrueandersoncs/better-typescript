import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import * as ts from "typescript"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

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
  const fixturePath = path.join(import.meta.dir, "../fixtures/rule")
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

test("prefer-effect-fn tracks TypeScript symbols by identity", async () => {
  const fixturePath = path.join(import.meta.dir, "../fixtures/rule")
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const loadedProject = project.projects[0]

  assert.ok(loadedProject)

  const sourceFile = loadedProject.program
    .getSourceFiles()
    .find((file) => file.fileName.endsWith("/src/cases.ts"))

  assert.ok(sourceFile)

  const checker = loadedProject.program.getTypeChecker()
  let effectSymbol: ts.Symbol | undefined

  const visit = (node: ts.Node): void => {
    if (effectSymbol === undefined && ts.isIdentifier(node) && node.text === "Effect") {
      effectSymbol = checker.getSymbolAtLocation(node)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  assert.ok(effectSymbol)

  Object.defineProperty(effectSymbol, "links", {
    configurable: true,
    enumerable: true,
    value: {
      iterationTypesOfIterable: {
        get yieldType(): never {
          throw new Error("TypeScript iteration type getter must not be read")
        }
      }
    }
  })

  const violations = lint({ project, rules: [ruleNamed("prefer-effect-fn")] })

  assert.ok(violations.length > 0)
})
