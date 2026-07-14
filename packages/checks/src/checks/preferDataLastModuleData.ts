import { Data } from "effect"
import type * as ts from "typescript"

/**
 * FunctionDefinition is the shared name, reportNode contract used by
 * dataLastModuleMatches and firstDefinition.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class FunctionDefinition extends Data.Class<{
  readonly name: string
  readonly reportNode: ts.Node
}> {}

/**
 * The declared model name and concept directory that constrain one data-last function.
 *
 * @modelRole shared
 * @remarks This record exists because symbol resolution and placement reporting both
 * consume the same normalized model identity. Removing it would duplicate path
 * normalization and risk those two phases disagreeing about the required directory.
 */
export class DataStructureModule extends Data.Class<{
  readonly name: string
  readonly moduleDirectory: string
}> {}
