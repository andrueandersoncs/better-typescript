import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { exclusiveConsumerOwnershipCandidates } from "@better-typescript/matchers/builtins/architectureExplore/exclusiveConsumerOwnershipHardBondRule"
import { SemanticModuleReferenceGraph } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleReferenceGraph"
import { exclusiveConsumerOwnershipEntityKey as entityKey } from "./exclusiveConsumerOwnershipEntityKey.js"
import { exclusiveConsumerOwnershipReference as reference } from "./exclusiveConsumerOwnershipReference.js"

test("ownership candidates use complete graph components", () => {
  const consumer = entityKey(1)
  const target = entityKey(2)
  const targetMember = entityKey(3)
  const graph = new SemanticModuleReferenceGraph({
    nodes: [consumer, target, targetMember],
    references: [reference(consumer, target, 4)],
    unownedConsumers: [],
    components: [[consumer], [target, targetMember]],
    subjects: []
  })

  const candidates = exclusiveConsumerOwnershipCandidates(Object.create(null), [], graph)

  assert.equal(candidates.length, 1)
  assert.deepEqual(candidates[0]?.evidence.targetComponent, [target, targetMember])
})

test("static catalogs do not own the independent entries they aggregate", () => {
  const catalog = entityKey(1)
  const firstEntry = entityKey(2)
  const secondEntry = entityKey(3)
  const graph = new SemanticModuleReferenceGraph({
    nodes: [catalog, firstEntry, secondEntry],
    references: [
      reference(catalog, firstEntry, 4, "aggregation"),
      reference(catalog, secondEntry, 5, "aggregation")
    ],
    unownedConsumers: [],
    components: [[catalog], [firstEntry], [secondEntry]],
    subjects: []
  })

  assert.deepEqual(exclusiveConsumerOwnershipCandidates(Object.create(null), [], graph), [])
})

test("a single static initializer reference still proves exclusive ownership", () => {
  const consumer = entityKey(1)
  const target = entityKey(2)
  const graph = new SemanticModuleReferenceGraph({
    nodes: [consumer, target],
    references: [reference(consumer, target, 3, "aggregation")],
    unownedConsumers: [],
    components: [[consumer], [target]],
    subjects: []
  })

  assert.equal(exclusiveConsumerOwnershipCandidates(Object.create(null), [], graph).length, 1)
})

test("a consumer with executable references is not a static catalog", () => {
  const consumer = entityKey(1)
  const firstTarget = entityKey(2)
  const secondTarget = entityKey(3)
  const graph = new SemanticModuleReferenceGraph({
    nodes: [consumer, firstTarget, secondTarget],
    references: [
      reference(consumer, firstTarget, 4, "aggregation"),
      reference(consumer, secondTarget, 5, "call")
    ],
    unownedConsumers: [],
    components: [[consumer], [firstTarget], [secondTarget]],
    subjects: []
  })

  assert.equal(exclusiveConsumerOwnershipCandidates(Object.create(null), [], graph).length, 2)
})
