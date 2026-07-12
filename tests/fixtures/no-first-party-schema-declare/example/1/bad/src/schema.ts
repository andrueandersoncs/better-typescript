import { Schema } from "effect"

type MyData = { readonly name: string }

const isMyData = (input: unknown): input is MyData =>
  typeof input === "object" && input !== null && "name" in input

export const MyDataSchema = Schema.declare(isMyData)
