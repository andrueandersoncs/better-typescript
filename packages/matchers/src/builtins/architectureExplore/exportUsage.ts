import { Data } from "effect"

// ExportUsage is shared prod-vs-test usage because matchers share one split.
export class ExportUsage extends Data.Class<{
  readonly productionCallCount: number
  readonly testCallCount: number
  readonly productionPaths: ReadonlyArray<string>
  readonly testPaths: ReadonlyArray<string>
  readonly hasProductionNonCallReference: boolean
}> {}
