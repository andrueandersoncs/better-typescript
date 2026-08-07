import { flow, Option } from "effect"
import { makeConfigExport } from "./configExport.js"
import type { ConfigExportName } from "./configExportName.js"
import type { UnknownRecord } from "./unknownRecord.js"

export const ownConfigExport =
  (name: ConfigExportName) => (valueFromRecord: (record: UnknownRecord) => unknown) => {
    const recordHasOwnName = (candidate: UnknownRecord) => Object.hasOwn(candidate, name)

    return flow(
      Option.liftPredicate(recordHasOwnName),
      Option.map(valueFromRecord),
      Option.map(makeConfigExport(name))
    )
  }
