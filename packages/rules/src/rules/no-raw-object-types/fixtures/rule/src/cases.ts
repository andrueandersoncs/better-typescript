// --- Parameter disallowed cases ---

// Inline object type in arrow function parameter
export const startServer = (config: { host: string; port: number }): boolean => // ~detect 29
  config.host.length > 0

// Inline object type in function declaration parameter
export function sendEmail(envelope: { to: string; body: string }): boolean { // ~detect 27
  return envelope.to.length > 0
}

// object keyword in parameter
export const processData = (data: object): string => String(data) // ~detect 29

// Destructured parameter with inline object type
export const formatUser = ({ // ~detect 28
  name,
  age
}: {
  name: string
  age: number
}): string => `${name} (${age})`

// Union containing inline object type in parameter
export const handleInput = (input: { value: string } | null): string => // ~detect 29
  input?.value ?? ""

// Intersection containing inline object type in parameter
export const identify = (entity: { id: number } & { name: string }): number => // ~detect 26
  entity.id

// --- Return type disallowed cases ---

// Inline object type as return type
export const createPair = ( // ~detect 27
  a: string,
  b: string
): { first: string; second: string } => ({
  first: a,
  second: b
})

// object keyword as return type
export const toObject = (value: string): object => ({ value }) // ~detect 25

// Union containing inline object type in return
export const tryParse = (raw: string): { parsed: boolean } | null => // ~detect 25
  raw.length > 0 ? { parsed: true } : null

// Method with inline object parameter
export class Connector {
  connect(options: { host: string; timeout: number }): boolean { // ~detect 11
    return options.host.length > 0
  }
}
