import { Data } from "effect"
import type * as ts from "typescript"

/**
 * DataLastFunctionDefinition is the shared name, reportNode contract used by
 * firstDefinition, declarationDefinition, and structureMatch.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class DataLastFunctionDefinition extends Data.Class<{
  readonly name: string
  readonly reportNode: ts.Node
}> {}

/**
 * DataStructureModule is the shared name, moduleDirectory contract used by
 * structureForSymbol, parameterStructure, and structureMatch.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class DataStructureModule extends Data.Class<{
  readonly name: string
  readonly moduleDirectory: string
}> {}
