import { Schema } from "effect"

export class MyData extends Schema.Class<MyData>("MyData")({
  name: Schema.String
}) {}
