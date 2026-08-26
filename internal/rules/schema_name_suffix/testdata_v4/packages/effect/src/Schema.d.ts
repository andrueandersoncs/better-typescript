declare const TypeId: "~effect/Schema/Schema"

export interface Schema<out A> {
  readonly [TypeId]: typeof TypeId
  readonly Type: A
  readonly Encoded: A
  readonly DecodingServices: never
  readonly EncodingServices: never
  readonly Rebuild: Schema<A>
  readonly ast: object
  readonly Iso: A
  readonly "~type.parameters": readonly []
  readonly "~type.make.in": A
  readonly "~type.make": A
  readonly "~type.constructor.default": "no-default"
  readonly "~type.mutability": "readonly"
  readonly "~type.optionality": "required"
  readonly "~encoded.mutability": "readonly"
  readonly "~encoded.optionality": "required"
  annotate(annotations: object): Schema<A>
  annotateKey(annotations: object): Schema<A>
  check(...checks: ReadonlyArray<unknown>): Schema<A>
  rebuild(ast: object): Schema<A>
  make(input: A): A
  makeOption(input: A): unknown
  makeEffect(input: A): unknown
  pipe(...args: ReadonlyArray<unknown>): unknown
}
export declare namespace Schema {
  type Type<S extends Schema<unknown>> = S["Type"]
}
export declare const String: Schema<string>
export declare const Struct: <Fields extends object>(fields: Fields) => Schema<{ readonly [K in keyof Fields]: unknown }>
