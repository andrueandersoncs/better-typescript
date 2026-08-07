import { Data } from "effect"
import type * as ts from "typescript"

// ProjectConfig is leaf config + commandLine because watch starts first.
export class ProjectConfig extends Data.Class<{
  readonly configPath: string
  readonly rootPath: string
  readonly parsed: ts.ParsedCommandLine
}> {}
