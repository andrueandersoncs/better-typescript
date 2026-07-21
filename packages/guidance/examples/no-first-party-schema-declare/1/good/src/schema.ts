import { Schema } from "effect"

export const MyData = Schema.Struct({
  name: Schema.String
})
export interface MyData extends Schema.Schema.Type<typeof MyData> {}
