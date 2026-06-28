// --- Parameter violations ---

// Inline object type in arrow function parameter
export const startServer = (config: { host: string; port: number }): boolean =>
  config.host.length > 0

// Inline object type in function declaration parameter
export function sendEmail(envelope: { to: string; body: string }): boolean {
  return envelope.to.length > 0
}

// object keyword in parameter
export const processData = (data: object): string => String(data)

// Destructured parameter with inline object type
export const formatUser = ({
  name,
  age
}: {
  name: string
  age: number
}): string => `${name} (${age})`

// Union containing inline object type in parameter
export const handleInput = (input: { value: string } | null): string =>
  input?.value ?? ""

// Intersection containing inline object type in parameter
export const identify = (entity: { id: number } & { name: string }): number =>
  entity.id

// --- Return type violations ---

// Inline object type as return type
export const createPair = (
  a: string,
  b: string
): { first: string; second: string } => ({
  first: a,
  second: b
})

// object keyword as return type
export const toObject = (value: string): object => ({ value })

// Union containing inline object type in return
export const tryParse = (raw: string): { parsed: boolean } | null =>
  raw.length > 0 ? { parsed: true } : null

// Method with inline object parameter
export class Connector {
  connect(options: { host: string; timeout: number }): boolean {
    return options.host.length > 0
  }
}
