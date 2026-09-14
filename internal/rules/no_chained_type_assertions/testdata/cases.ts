declare const input: unknown
const allowed = input as string
const invalid = (input as unknown) as string
const constants = ({ id: 1 } as const) as const
void allowed
void invalid
void constants
