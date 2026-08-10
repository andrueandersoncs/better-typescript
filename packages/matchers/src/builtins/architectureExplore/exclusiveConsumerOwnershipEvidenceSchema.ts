import { Schema } from "effect"
import { entityKeyComponentSchema } from "./entityKeyComponentSchema.js"
import { semanticReferenceWitnessSchema } from "./semanticReferenceWitnessSchema.js"
import { unownedSemanticReferenceWitnessSchema } from "./unownedSemanticReferenceWitnessSchema.js"

const exclusiveConsumerOwnershipTagSchema = Schema.Literal("exclusive-consumer-ownership")
const exclusiveConsumerOwnershipVersionSchema = Schema.Literal(2)
const incomingConsumerComponentsSchema = Schema.Array(entityKeyComponentSchema)
const unownedConsumersSchema = Schema.Array(unownedSemanticReferenceWitnessSchema)

// Version 2 carries resolved subject keys because ownership must not erase subject boundaries.
export const exclusiveConsumerOwnershipEvidenceSchema = Schema.Struct({
  _tag: exclusiveConsumerOwnershipTagSchema,
  version: exclusiveConsumerOwnershipVersionSchema,
  sourceComponent: entityKeyComponentSchema,
  targetComponent: entityKeyComponentSchema,
  consumerSubjects: entityKeyComponentSchema,
  targetSubjects: entityKeyComponentSchema,
  incomingConsumerComponents: incomingConsumerComponentsSchema,
  unownedConsumers: unownedConsumersSchema,
  witness: semanticReferenceWitnessSchema
})

export interface exclusiveConsumerOwnershipEvidenceSchema extends Schema.Schema.Type<
  typeof exclusiveConsumerOwnershipEvidenceSchema
> {}
