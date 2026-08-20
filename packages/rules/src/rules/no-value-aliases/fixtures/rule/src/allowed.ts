import { identity as identityFunction } from "effect/Function"

interface Container {
  readonly value?: string
}

type ValueAlias = string

const invoked = identityFunction("value")
const literal = "value"
const object = { value: "value" }
const selected = true ? identityFunction : String
const optional = object?.value
const computed = object["value"]
const fromTemporary = ({ value: "value" }).value
const { value: renamed } = object
let mutableAlias = identityFunction
var variableAlias = identityFunction

declare const container: Container

void invoked
void literal
void selected
void optional
void computed
void fromTemporary
void renamed
void mutableAlias
void variableAlias
void container

export { identityFunction as exportedIdentity }
export type { ValueAlias }
