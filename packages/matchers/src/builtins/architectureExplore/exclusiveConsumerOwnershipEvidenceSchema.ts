import { Schema } from "effect"
import { entityKeyComponentSchema } from "./entityKeyComponentSchema.js"
import { semanticReferenceWitnessSchema } from "./semanticReferenceWitnessSchema.js"
import { unownedSemanticReferenceWitnessSchema } from "./unownedSemanticReferenceWitnessSchema.js"

const exclusiveConsumerOwnershipTagSchema = Schema.Literal("exclusive-consumer-ownership")
const exclusiveConsumerOwnershipVersionSchema = Schema.Literal(1)
const incomingConsumerComponentsSchema = Schema.Array(entityKeyComponentSchema)
const unownedConsumersSchema = Schema.Array(unownedSemanticReferenceWitnessSchema)

// exclusive-ownership evidence is tagged because the hard-bond rule freezes one payload.
export const exclusiveConsumerOwnershipEvidenceSchema = Schema.Struct({
  _tag: exclusiveConsumerOwnershipTagSchema,
  version: exclusiveConsumerOwnershipVersionSchema,
  sourceComponent: entityKeyComponentSchema,
  targetComponent: entityKeyComponentSchema,
  incomingConsumerComponents: incomingConsumerComponentsSchema,
  unownedConsumers: unownedConsumersSchema,
  witness: semanticReferenceWitnessSchema
})

export interface exclusiveConsumerOwnershipEvidenceSchema extends Schema.Schema.Type<
  typeof exclusiveConsumerOwnershipEvidenceSchema
> {}
