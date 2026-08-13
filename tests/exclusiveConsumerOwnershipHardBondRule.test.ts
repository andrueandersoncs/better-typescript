import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Option } from "effect"
import { ownershipCandidateForComponent } from "@better-typescript/matchers/builtins/architectureExplore/ownershipCandidateForComponent"
import { SemanticModuleReferenceGraph } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleReferenceGraph"
import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"

const entityKey = (start: number): SemanticModuleEntityKey => ({
  path: "src/main.ts",
  start,
  end: start + 1,
  syntaxKind: 262
})

test("ownership candidates require the complete target component", () => {
  const consumer = entityKey(1)
  const target = entityKey(2)
  const targetMember = entityKey(3)
  const reference = entityKey(4)
  const graph = new SemanticModuleReferenceGraph({
    nodes: [consumer, target, targetMember],
    references: [{ consumer, target, reference, kind: "call" }],
    unownedConsumers: [],
    components: [[consumer], [target, targetMember]],
    subjects: []
  })

  const exactCandidate = ownershipCandidateForComponent(graph)([target, targetMember])
  const partialCandidate = ownershipCandidateForComponent(graph)([target])

  assert.ok(Option.isSome(exactCandidate))
  assert.ok(Option.isNone(partialCandidate))
})
