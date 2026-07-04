import { Predicate, Schema } from "effect"
import type * as ts from "typescript"

// Allowed: Schema.declare for third-party types from TypeScript
const isTsNode = (input: unknown): input is ts.Node =>
  Predicate.hasProperty(input, "kind")

const TsNodeSchema = Schema.declare(isTsNode)

const isTsProgram = (input: unknown): input is ts.Program =>
  Predicate.hasProperty(input, "getTypeChecker")

const TsProgramSchema = Schema.declare(isTsProgram)

// Allowed: Schema.declare for first-party function types (not data structures)
type MyHandler = (value: string) => number

const isMyHandler = (input: unknown): input is MyHandler =>
  typeof input === "function"

const MyHandlerSchema = Schema.declare(isMyHandler)

// Allowed: Schema.declare guarding a generic type parameter — the placeholder stands
// for a caller-supplied type, not a first-party data structure.
const isParameterValue = <F>(input: unknown): input is F => input !== null

const parameterField = <F>() => Schema.declare(isParameterValue<F>)

// Allowed: normal Schema class definition (not Schema.declare)
class MyData extends Schema.Class<MyData>("MyData")({
  name: Schema.String,
  value: Schema.Number
}) {}

void TsNodeSchema
void TsProgramSchema
void MyHandlerSchema
void parameterField
void MyData
