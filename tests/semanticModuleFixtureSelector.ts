import type { SemanticModuleSnapshotV1 } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleSnapshotV1"

type SemanticModuleDeclarationKind = SemanticModuleSnapshotV1["entities"][number]["declarationKind"]

export interface SemanticModuleFixtureSelector {
  readonly path: string
  readonly declarationKind: SemanticModuleDeclarationKind
  readonly displayName: string
  readonly occurrence: number
}
