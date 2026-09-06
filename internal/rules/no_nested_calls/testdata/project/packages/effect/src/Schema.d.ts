export interface Schema {
  check(...checks: ReadonlyArray<unknown>): Schema
}

export const String: Schema
export function Array(schema: Schema): Schema
export function NullOr(schema: Schema): Schema
export function TaggedUnion(cases: Readonly<Record<string, unknown>>): Schema
export function isUUID(version: number): unknown
