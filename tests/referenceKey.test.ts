import assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { Effect, Hash, HashMap, HashSet, Option } from "effect"
import * as ts from "typescript"
import { referenceKey } from "@better-typescript/checks/support/referenceKey"
import { loadProject } from "@better-typescript/core/project/loadProject"

test("referenceKey gives Effect collections stable declaration identity", async () => {
  const workspace = await Effect.runPromise(loadProject(path.resolve("tests/fixtures/no-unused")))
  const project = workspace.projects[0]

  assert.ok(project)

  const sourceFile = project.program
    .getSourceFiles()
    .find((source) => source.fileName.endsWith("/src/allowed.ts"))

  assert.ok(sourceFile)

  const names = sourceFile.statements.flatMap((statement) => {
    if (!ts.isVariableStatement(statement)) {
      return []
    }

    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name] : []
    )
  })
  const localValueName = names.find((name) => name.text === "localValue")
  const localFunctionName = names.find((name) => name.text === "localFunction")

  assert.ok(localValueName)
  assert.ok(localFunctionName)

  const checker = project.program.getTypeChecker()
  const localValue = checker.getSymbolAtLocation(localValueName)
  const localFunction = checker.getSymbolAtLocation(localFunctionName)

  assert.ok(localValue)
  assert.ok(localFunction)

  const first = referenceKey(localValue)
  const second = referenceKey(localValue)
  const distinct = referenceKey(localFunction)

  assert.equal(first, second)
  assert.equal(Hash.hash(first), Hash.hash(second))
  assert.notEqual(first, distinct)

  const map = HashMap.make([first, "found"])
  const set = HashSet.make(first)

  assert.equal(Option.getOrUndefined(HashMap.get(map, second)), "found")
  assert.equal(Option.isNone(HashMap.get(map, distinct)), true)
  assert.equal(HashSet.has(set, second), true)
  assert.equal(HashSet.has(set, distinct), false)
})
