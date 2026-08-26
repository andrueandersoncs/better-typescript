export declare const TypeId: unique symbol

export interface Schema<out A> {
  readonly [TypeId]: typeof TypeId
  readonly Type: A
  readonly Encoded: A
  readonly Context: never
  readonly ast: object
  annotations(annotations: object): Schema<A>
  pipe(...args: ReadonlyArray<unknown>): unknown
}
export declare namespace Schema {
  type Type<S extends Schema<unknown>> = S["Type"]
}
export declare const String: () => Schema<string>
export declare const Struct: <Fields extends object>(fields: Fields) => Schema<{ readonly [K in keyof Fields]: unknown }>
