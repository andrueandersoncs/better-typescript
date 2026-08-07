import { Data } from "effect"
import type { ImportedNameUsage } from "@better-typescript/matchers/builtins/architectureExplore/importedNameUsage"

// WorkspaceImportEdge freezes importer edges because advice cannot reopen Program import graphs.
export class WorkspaceImportEdge extends Data.Class<{
  readonly importerPath: string
  readonly importedPath: string
  readonly fromTest: boolean
  readonly names: ReadonlyArray<ImportedNameUsage>
}> {}
