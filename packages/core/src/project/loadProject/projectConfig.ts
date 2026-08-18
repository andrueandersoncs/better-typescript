import { Data } from "effect"
import type * as ts from "typescript"

// ProjectConfig retains parsed config because discovery and program creation are separate phases.
export class ProjectConfig extends Data.Class<{
  readonly configPath: string
  readonly parsed: ts.ParsedCommandLine
}> {}
