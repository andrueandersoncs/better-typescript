import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { exclusiveConsumerOwnershipHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/exclusiveConsumerOwnershipHardBondRule"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import type { SemanticModuleHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRule"
import { SemanticModuleReferenceGraph } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleReferenceGraph"
import { semanticReferenceCycleHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticReferenceCycleHardBondRule"
import { semanticSubjectOwnershipHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticSubjectOwnershipHardBondRule"
import { exclusiveConsumerOwnershipEntityKey as entityKey } from "./exclusiveConsumerOwnershipEntityKey.js"
import { exclusiveConsumerOwnershipReference as reference } from "./exclusiveConsumerOwnershipReference.js"

test("semantic reference cycles produce candidates through the rule interface", () => {
  const first = entityKey(1)
  const second = entityKey(2)
  const third = entityKey(3)
  const graph = new SemanticModuleReferenceGraph({
    references: [reference(first, second, 4), reference(second, first, 5)],
    unownedConsumers: [],
    components: [[first, second], [third]],
    subjects: []
  })

  const candidates = semanticReferenceCycleHardBondRule.candidates(Object.create(null), [], graph)

  assert.equal(candidates.length, 1)
  assert.deepEqual(candidates[0]?.left, first)
  assert.deepEqual(candidates[0]?.right, second)
})

test("semantic subjects produce candidates through the rule interface", () => {
  const operation = entityKey(1)
  const subject = entityKey(2)
  const anchor = entityKey(3)
  const graph = new SemanticModuleReferenceGraph({
    references: [],
    unownedConsumers: [],
    components: [[operation], [subject]],
    subjects: [{ operation, subject, derivation: "subject-parameters", anchor }]
  })

  const candidates = semanticSubjectOwnershipHardBondRule.candidates(Object.create(null), [], graph)

  assert.equal(candidates.length, 1)
  assert.deepEqual(candidates[0]?.left, operation)
  assert.deepEqual(candidates[0]?.right, subject)
})

test("semantic module production interfaces remain importable", () => {
  const ruleInterfaces: ReadonlyArray<SemanticModuleHardBondRule> = [
    exclusiveConsumerOwnershipHardBondRule,
    semanticReferenceCycleHardBondRule,
    semanticSubjectOwnershipHardBondRule
  ]
  const engineOperations = [
    "buildSemanticModuleSnapshot",
    "moduleFor",
    "peersFor",
    "proofBetween",
    "semanticModulePlacementMatcher"
  ] as const satisfies ReadonlyArray<keyof typeof semanticModuleEngine>

  assert.deepEqual(
    ruleInterfaces.map((rule) => rule.id),
    ["exclusive-consumer-ownership", "semantic-reference-cycle", "semantic-subject-ownership"]
  )

  for (const operation of engineOperations) {
    assert.equal(typeof semanticModuleEngine[operation], "function")
  }
})
