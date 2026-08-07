import { Data } from "effect"

// ModuleEdge is the shared normalized import edge because graph matchers need it.
export class ModuleEdge extends Data.Class<{
  readonly importerPath: string
  readonly importedPath: string
  readonly fromTest: boolean
}> {}
