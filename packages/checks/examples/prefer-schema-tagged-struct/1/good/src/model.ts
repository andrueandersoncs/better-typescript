import { Schema } from "effect"

export const MyEvent = Schema.TaggedStruct("MyEvent", {
  payload: Schema.String
})
export interface MyEvent extends Schema.Schema.Type<typeof MyEvent> {}

export const event = MyEvent.make({ payload: "value" })
