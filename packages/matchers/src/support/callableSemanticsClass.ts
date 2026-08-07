import * as ts from "typescript"
import { CallableNameClaims } from "./callableNameClaims.js"
import { CallableResultSemantics } from "./callableResultSemantics.js"
import type { FunctionDefinition } from "./functionDefinition.js"
import { ProjectionEvidence } from "./projectionEvidence.js"
import type { SemanticRole } from "./semanticRole.js"
import { Data, Option, HashSet } from "effect"

// CallableSemantics shares one function analysis because every naming policy consumes it.
export class CallableSemantics extends Data.Class<{
  readonly definition: FunctionDefinition
  readonly node: ts.Identifier
  readonly name: CallableNameClaims
  readonly result: CallableResultSemantics
  readonly sourceWords: ReadonlyArray<string>
  readonly operationWords: ReadonlyArray<string>
  readonly projection: Option.Option<ProjectionEvidence>
  readonly roles: HashSet.HashSet<SemanticRole>
}> {}
