import { Array, Equal, Schema } from "effect"
import { strictEqual } from "../equivalence/strictEqual.js"
import { Location } from "./locationData.js"

const optionalUnknown = Schema.optional(Schema.Unknown)

// Detection is the shared finding contract because signal owners need one vocabulary.
export const Detection = Schema.Struct({
  location: Location,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
})

export interface Detection extends Schema.Schema.Type<typeof Detection> {}

export const detectionEquals = (a: Detection, b: Detection) => {
  const samePath = strictEqual(b.location.path)(a.location.path)
  const sameLine = strictEqual(b.location.line)(a.location.line)
  const sameColumn = strictEqual(b.location.column)(a.location.column)
  const sameMessage = strictEqual(b.message)(a.message)
  const sameHint = strictEqual(b.hint)(a.hint)
  const bothStructural = Equal.isEqual(a.data) && Equal.isEqual(b.data)
  const identical = strictEqual(b.data)(a.data)
  const sameData = bothStructural ? Equal.equals(a.data, b.data) : identical
  const conditions = Array.make(samePath, sameLine, sameColumn, sameMessage, sameHint, sameData)

  return Array.every(conditions, Boolean)
}

// One array equivalence lives here because detection batches compare as whole detections.
export const detectionsEquivalence = Array.makeEquivalence(detectionEquals)
