import { Data } from "effect"

// ProjectionEvidence stores one traced result because policies compare its terminal noun.
export class ProjectionEvidence extends Data.Class<{
  readonly resultWords: ReadonlyArray<string>
}> {}
