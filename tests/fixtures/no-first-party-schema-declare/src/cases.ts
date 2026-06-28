import { Predicate, Schema } from "effect"

// Case 1: Named predicate with a first-party type alias
type MyData = { readonly name: string; readonly value: number }

const isMyData = (input: unknown): input is MyData =>
  Predicate.hasProperty(input, "name")

const MyDataSchema = Schema.declare(isMyData)

// Case 2: Named predicate with a first-party interface
interface AppConfig {
  readonly host: string
  readonly port: number
}

const isAppConfig = (input: unknown): input is AppConfig =>
  Predicate.hasProperty(input, "host")

const AppConfigSchema = Schema.declare(isAppConfig)

// Case 3: Inline predicate with a first-party type
const InlineSchema = Schema.declare(
  (input: unknown): input is MyData => Predicate.hasProperty(input, "name")
)

void MyDataSchema
void AppConfigSchema
void InlineSchema
