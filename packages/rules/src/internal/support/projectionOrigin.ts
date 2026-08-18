import * as ts from "typescript"
import { Data, Option } from "effect"

// ProjectionOrigin tracks recursive provenance because aliases and wrappers share traversal.
export class ProjectionOrigin extends Data.Class<{
  readonly path: ReadonlyArray<string>
  readonly head: Option.Option<string>
  readonly resultWords: ReadonlyArray<string>
  readonly valueType: ts.Type
}> {}
