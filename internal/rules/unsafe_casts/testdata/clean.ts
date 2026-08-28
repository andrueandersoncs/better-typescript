type AllowedUnknownAlias = unknown
type AllowedAnyAlias = any

declare const value: unknown
declare const concreteValue: string
declare const anyValue: any

const targetUnknown = value as unknown
const targetUnknownAlias = value as AllowedUnknownAlias
const targetAnyAlias = value as AllowedAnyAlias
const concreteSource = concreteValue as "fixed"
const anySource = anyValue as number
const satisfied = value satisfies unknown

if (typeof value === "string") {
  const narrowed = value as string
}
