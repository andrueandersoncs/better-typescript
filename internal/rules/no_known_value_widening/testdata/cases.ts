type Command = () => void
const startCommand = () => undefined
const value: unknown = 1
const commands: Record<string, Command> = { start: startCommand }
const accumulator: Record<string, Command> = {}
function isString(input: unknown): input is string { return true }
isString("known")
void value
void commands
void accumulator
type User = { readonly id: string }
const namedUser: User = { id: "one" }
type Key = string
const keyed: Record<Key, number> = { one: 1 }
const mapped: { [K in "one"]: number } = { one: 1 }
declare const broadObject: object
isString(broadObject)
;((candidate: unknown): candidate is string => true)("known")
const regexValue: unknown = /known/
type Identity<T> = T
type Forward<T> = Identity<T>
const forwarded: Forward<unknown> = 1
void namedUser
void keyed
void mapped
void regexValue
void forwarded
type WrappedUser = Readonly<{ readonly id: string }>
const wrappedUser: WrappedUser = { id: "wrapped" }
const emptyMapped: { [K in string]: number } = {}
declare function readBroad(): object
isString(readBroad())
type ForwardParenthesized<T> = Identity<(T)>
const parenthesizedForward: ForwardParenthesized<unknown> = 1
void wrappedUser
void emptyMapped
void parenthesizedForward
