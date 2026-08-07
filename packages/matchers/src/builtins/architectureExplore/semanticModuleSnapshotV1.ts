import { Schema } from "effect"
import { SemanticModuleEntityRecord } from "./semanticModuleEntityRecordSchema.js"
import { SemanticModuleAcceptedBondRecord } from "./semanticModuleAcceptedBondRecord.js"
import { SemanticModuleSuppressedBondRecord } from "./semanticModuleSuppressedBondRecord.js"
import { SemanticModuleExclusionRecord } from "./semanticModuleExclusionRecord.js"
import { SemanticModuleRecord } from "./semanticModuleRecord.js"

const semanticModuleEntityRecordsSchema = Schema.Array(SemanticModuleEntityRecord)
const semanticModuleRecordsSchema = Schema.Array(SemanticModuleRecord)
const acceptedBondRecordsSchema = Schema.Array(SemanticModuleAcceptedBondRecord)
const suppressedBondRecordsSchema = Schema.Array(SemanticModuleSuppressedBondRecord)
const exclusionRecordsSchema = Schema.Array(SemanticModuleExclusionRecord)

// SnapshotV1 is the matcher seam because queries must not rescan TypeScript.
export const SemanticModuleSnapshotV1 = Schema.Struct({
  entities: semanticModuleEntityRecordsSchema,
  modules: semanticModuleRecordsSchema,
  acceptedBonds: acceptedBondRecordsSchema,
  suppressedBonds: suppressedBondRecordsSchema,
  exclusions: exclusionRecordsSchema
})

export interface SemanticModuleSnapshotV1 extends Schema.Schema.Type<
  typeof SemanticModuleSnapshotV1
> {}

export {
  semanticModuleEntityRecordsSchema,
  semanticModuleRecordsSchema,
  acceptedBondRecordsSchema,
  suppressedBondRecordsSchema,
  exclusionRecordsSchema
}
