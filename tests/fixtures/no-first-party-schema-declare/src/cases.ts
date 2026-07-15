import { Predicate, Schema } from "effect"

// Case 1: Named predicate with a first-party type-literal alias
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

// Case 3: Inline predicate with a first-party structural type
const InlineSchema = Schema.declare((input: unknown): input is MyData =>
  Predicate.hasProperty(input, "name")
)

// Case 4: Named predicate with a first-party class
class SessionState {
  constructor(readonly token: string) {}
}

const isSessionState = (input: unknown): input is SessionState =>
  input instanceof SessionState

const SessionStateSchema = Schema.declare(isSessionState)

type AppConfigAlias = AppConfig

const isAppConfigAlias = (input: unknown): input is AppConfigAlias =>
  Predicate.hasProperty(input, "host")

const AppConfigAliasSchema = Schema.declare(isAppConfigAlias)

void MyDataSchema
void AppConfigSchema
void InlineSchema
void SessionStateSchema
