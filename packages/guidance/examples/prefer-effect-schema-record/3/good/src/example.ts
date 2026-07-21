import { Schema } from "effect"

export const Example = Schema.Struct({
  myString: Schema.String,
  myNumber: Schema.Number
})
export interface Example extends Schema.Schema.Type<typeof Example> {}

export const example = Example.make({ myString: "Ada", myNumber: 36 })
