import { Data } from "effect"
import type { Target } from "@better-typescript/matchers/matcher/workspaceTarget"

// FindingSource is pre-location guidance output because matchers must stay prose-free.
export class FindingSource extends Data.Class<{
  readonly target: Target
  readonly message: string
  readonly hint: string
  readonly data: unknown
}> {}
