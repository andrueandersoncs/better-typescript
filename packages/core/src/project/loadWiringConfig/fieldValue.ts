import { Option } from "effect"
import type { UnknownRecord } from "./unknownRecord.js"

export const fieldValue = (record: UnknownRecord, field: string) =>
  Object.hasOwn(record, field) ? Option.some(record[field]) : Option.none()
