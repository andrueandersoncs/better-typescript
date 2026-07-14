import { Schema } from "effect"

export class ExampleClass extends Schema.Class<ExampleClass>("ExampleClass")({
  myString: Schema.String,
  myNumber: Schema.Number
}) {}

export const example = new ExampleClass({ myString: "Ada", myNumber: 36 })
