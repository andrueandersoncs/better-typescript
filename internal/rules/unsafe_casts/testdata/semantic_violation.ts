type UnknownSourceAlias = unknown
type ConcreteAlias = number

declare const directValue: unknown
declare function loadValue(): unknown

const direct = directValue as string
const adjacent = directValue as unknown as string
const splitUnknown = directValue as unknown
const split = splitUnknown as { ok: true }
const aliasSource: UnknownSourceAlias = directValue
const alias = aliasSource as ConcreteAlias
const callReturn = loadValue() as boolean
const parenthesized = (directValue) as symbol
const angleAssertion = <bigint>directValue
