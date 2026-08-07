import {
  SemanticModulePlacementEntityRecord,
  type SemanticModulePlacementEntityRecord as PlacementEntity
} from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementEntityRecord.js"
const entityKey = (
  path: string,
  start: number,
  end: number,
  syntaxKind: number
): PlacementEntity["key"] => ({ path, start, end, syntaxKind })

export const entity = (input: {
  readonly path: string
  readonly start: number
  readonly end: number
  readonly syntaxKind: number
  readonly displayName: string
  readonly declarationKind: PlacementEntity["declarationKind"]
  readonly line: number
  readonly column: number
}): PlacementEntity => {
  const key = entityKey(input.path, input.start, input.end, input.syntaxKind)

  return SemanticModulePlacementEntityRecord.make({
    key,
    declarationAnchors: [key],
    stratum: "production",
    displayName: input.displayName,
    declarationKind: input.declarationKind,
    line: input.line,
    column: input.column
  })
}
