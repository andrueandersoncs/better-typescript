import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Array, Effect } from "effect"
import * as ts from "typescript"
import { makePolicy, makeFindings, toPolicies } from "@better-typescript/core/engine/policy"
import { makeNodeMatch } from "@better-typescript/matchers/matcher/data"
import { nodeMatcher } from "@better-typescript/matchers/matcher"
import { makeContext } from "@better-typescript/matchers/sources"
import { loadProject } from "@better-typescript/core/project/loadProject"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-undefined")

const undefinedIdentifier = (node: ts.Node): node is ts.Identifier =>
  ts.isIdentifier(node) && node.text === "undefined"

interface UndefinedIdentifierFact {
  readonly kind: "undefined-identifier"
}

const undefinedIdentifierFact: UndefinedIdentifierFact = { kind: "undefined-identifier" }

const isUndefinedIdentifierFact = (data: unknown): data is UndefinedIdentifierFact =>
  typeof data === "object" &&
  data !== null &&
  "kind" in data &&
  data.kind === "undefined-identifier"

const undefinedMatcher = nodeMatcher(Array.of(ts.SyntaxKind.Identifier))(undefinedIdentifier)(
  () => (node) => Array.of(makeNodeMatch(node, undefinedIdentifierFact))
)

const undefinedPolicy = makePolicy({
  name: "undefined-identifier",
  matcher: undefinedMatcher,
  guidance: () => (match) =>
    makeFindings(
      match.target,
      "Undefined identifier.",
      "Model absence explicitly with Option.",
      match.fact
    ),
  examples: { _tag: "inline", examples: Array.empty() }
})

test("policy guidance renders matcher facts without prose in the matcher", async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  assert.notEqual(project, undefined)

  if (project === undefined) {
    return
  }

  const context = makeContext(project.rootPath)(project.program)
  const detections = toPolicies(Array.of(undefinedPolicy))(() => true)(context)
  const firstPolicyDetections = detections[0] ?? Array.empty()

  assert.equal(firstPolicyDetections.length > 0, true)
  assert.equal(
    Array.every(
      firstPolicyDetections,
      (detection) => detection.message === "Undefined identifier."
    ),
    true
  )
  assert.equal(
    Array.every(
      firstPolicyDetections,
      (detection) => detection.hint === "Model absence explicitly with Option."
    ),
    true
  )
  assert.equal(
    Array.every(firstPolicyDetections, (detection) => isUndefinedIdentifierFact(detection.data)),
    true
  )
})
