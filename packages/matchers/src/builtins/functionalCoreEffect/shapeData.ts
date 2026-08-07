import { Array, Schema } from "effect"
import { architectureRoleSchema } from "./architectureRoleSchema.js"

const shapeKinds = Array.make<
  ["effect-orchestrator", "adapter-business-logic", "thick-composition-root", "pure-service"]
>("effect-orchestrator", "adapter-business-logic", "thick-composition-root", "pure-service")

const shapeKindSchema = Schema.Literals(shapeKinds)

// FunctionalCoreShapeData is shape payload because silent checks and derive share one record.
export const FunctionalCoreShapeData = Schema.Struct({
  kind: shapeKindSchema,
  role: architectureRoleSchema,
  branchCount: Schema.Number,
  functionCount: Schema.Number,
  serviceCount: Schema.Number,
  effectfulMemberCount: Schema.Number,
  transformationCount: Schema.Number
})

export interface FunctionalCoreShapeData extends Schema.Schema.Type<
  typeof FunctionalCoreShapeData
> {}
