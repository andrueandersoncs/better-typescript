import { Brand, Predicate, Schema } from "effect"
import type * as ts from "typescript"

// Allowed: Schema.declare for third-party types from TypeScript
const isTsNode = (input: unknown): input is ts.Node =>
  Predicate.hasProperty(input, "kind")

const TsNodeSchema = Schema.declare(isTsNode)

const isTsProgram = (input: unknown): input is ts.Program =>
  Predicate.hasProperty(input, "getTypeChecker")

const TsProgramSchema = Schema.declare(isTsProgram)

// Allowed: Schema.declare for first-party function types (not structural models)
type MyHandler = (value: string) => number

const isMyHandler = (input: unknown): input is MyHandler =>
  typeof input === "function"

const MyHandlerSchema = Schema.declare(isMyHandler)

// Allowed: Schema.declare guarding a generic type parameter — the placeholder stands
// for a caller-supplied type, not a first-party structural model.
const isParameterValue = <F>(input: unknown): input is F => input !== null

const parameterField = <F>() => Schema.declare(isParameterValue<F>)

// Allowed: Effect v4 first-party opaque/branded type validated by a type guard
type UserId = string & Brand.Brand<"UserId">

const isUserId = (input: unknown): input is UserId =>
  typeof input === "string" && input.startsWith("user_")

const UserIdSchema = Schema.declare(isUserId)

// Allowed: normal Schema.Struct definition (not Schema.declare)
const MyData = Schema.Struct({
  name: Schema.String,
  value: Schema.Number
})
interface MyData extends Schema.Schema.Type<typeof MyData> {}

void TsNodeSchema
void TsProgramSchema
void MyHandlerSchema
void parameterField
void UserIdSchema
void MyData
