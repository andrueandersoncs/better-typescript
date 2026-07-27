import { Array, Function } from "effect"
import {
  CodeFence,
  type Constraint,
  type ConstraintDocument,
  type Definition,
  type Example,
  type FenceLanguage,
  type FenceOwnerKind
} from "./data.ts"

// Fences are enumerated from the model because diagnostics must name the owning entry.

const makeFence = (
  kind: FenceOwnerKind,
  index: number,
  heading: string,
  field: string,
  language: FenceLanguage,
  code: string
) =>
  CodeFence.make({
    id: `${kind}/${index}/${field}`,
    kind,
    index,
    heading,
    field,
    language,
    code
  })

const definitionPredicateFence = (definition: Definition, index: number) =>
  makeFence(
    "definition",
    index,
    definition.term,
    "predicateImplementation",
    "ts",
    definition.predicateImplementation
  )

const comparisonExampleFence = (definition: Definition, index: number) => (example: Example) =>
  makeFence(
    "definition",
    index,
    definition.term,
    "comparisonExample",
    example.language,
    example.code
  )

const definitionExampleFence =
  (definition: Definition, index: number) => (example: Example, position: number) =>
    makeFence(
      "definition",
      index,
      definition.term,
      `examples/${position}`,
      example.language,
      example.code
    )

const definitionFences = (definition: Definition, index: number) => {
  const predicate = definitionPredicateFence(definition, index)

  const comparisons = Array.map(
    definition.comparisonExamples,
    comparisonExampleFence(definition, index)
  )

  const examples = Array.map(definition.examples, definitionExampleFence(definition, index))
  const withPredicate = Array.of(predicate)
  const withComparisons = Array.appendAll(withPredicate, comparisons)

  return Array.appendAll(withComparisons, examples)
}

const constraintFence = (constraint: Constraint, index: number) => (field: string, code: string) =>
  makeFence("constraint", index, constraint.title, field, "ts", code)

const constraintFences = (constraint: Constraint, index: number) => {
  const fence = constraintFence(constraint, index)
  const verification = fence("verificationImplementation", constraint.verificationImplementation)
  const allowed = fence("allowedExample", constraint.allowedExample)
  const violating = fence("violatingExample", constraint.violatingExample)

  return Array.make(verification, allowed, violating)
}

export const codeFences = (document: ConstraintDocument) => {
  const fromDefinitions = Array.flatMap(document.definitions, definitionFences)
  const fromConstraints = Array.flatMap(document.constraints, constraintFences)

  return Array.appendAll(fromDefinitions, fromConstraints)
}

const blankLine = Function.constant("")

// stripFences blanks fences in place because prose audits must keep stable line numbers.
const blankFenceBlock = (block: string) => {
  const lines = block.split("\n")
  const blankLines = Array.map(lines, blankLine)

  return Array.join(blankLines, "\n")
}

const fenceBlockPattern = /^```[^\n]*\n[\s\S]*?^```[ \t]*$/gmu

export const stripFences = (markdown: string) =>
  markdown.replace(fenceBlockPattern, blankFenceBlock)
