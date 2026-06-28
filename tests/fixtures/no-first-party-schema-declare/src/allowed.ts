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

// Allowed: normal Schema class definition (not Schema.declare)
class MyData extends Schema.Class<MyData>("MyData")({
  name: Schema.String,
  value: Schema.Number
}) {}

void TsNodeSchema
void TsProgramSchema
void MyHandlerSchema
void MyData
