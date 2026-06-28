// Named interface used as parameter
interface ServerAddress {
  readonly host: string
  readonly port: number
}

export const startServer = (address: ServerAddress): boolean =>
  address.host.length > 0

// Named type alias used as parameter
type EmailEnvelope = {
  readonly to: string
  readonly body: string
}

export const sendEmail = (envelope: EmailEnvelope): boolean =>
  envelope.to.length > 0

// Primitive parameter types
export const add = (a: number, b: number): number => a + b

// Array of named type
export const countAddresses = (
  addresses: ReadonlyArray<ServerAddress>
): number => addresses.length

// Named type as return type
export const createAddress = (host: string, port: number): ServerAddress => ({
  host,
  port
})

// Generic type with named type argument
export const firstAddress = (
  addresses: Map<string, ServerAddress>
): ServerAddress | undefined => addresses.values().next().value

// No type annotation on parameter (inferred)
export const identity = (value: number) => value

// Union of named types
export const stringOrNumber = (value: string | number): string => String(value)

// Type alias for inline object defined at module level — the parameter uses the named alias
type Pair = { readonly first: string; readonly second: string }

export const createPair = (a: string, b: string): Pair => ({
  first: a,
  second: b
})

// Function type parameter (callback) — not an object type
export const applyFn = (
  transform: (value: number) => number,
  input: number
): number => transform(input)

// Class used as parameter type
class UserRecord {
  constructor(readonly name: string) {}
}

export const greetUser = (user: UserRecord): string => `Hello, ${user.name}`

// Tuple type — not an anonymous object
export const swapTuple = (pair: [string, number]): [number, string] => [
  pair[1],
  pair[0]
]

// Inline object inside a generic type argument is not flagged at the parameter level
export const wrapItems = (items: ReadonlyArray<{ value: number }>): number =>
  items.length
