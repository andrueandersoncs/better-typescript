import { Data } from "effect"
import type * as ts from "typescript"
import { ArchitectureEvidence } from "./architectureEvidenceType.js"

// The cache retains one Program because workspace analysis is sequential.
export class CachedArchitectureEvidence extends Data.Class<{
  readonly program: ts.Program
  readonly evidence: ArchitectureEvidence
}> {}
