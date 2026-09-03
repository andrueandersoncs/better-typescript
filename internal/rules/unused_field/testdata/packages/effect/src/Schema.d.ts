export declare const TypeId: unique symbol

export interface Schema<out A> {
  readonly [TypeId]: typeof TypeId
  readonly Type: A
  make(value: A): A
}
export declare namespace Schema {
  type Type<S extends Schema<unknown>> = S["Type"]
}
export declare const String: Schema<string>
export declare const Number: Schema<number>
export declare const Struct: <Fields extends Record<string, Schema<unknown>>>(fields: Fields) => Schema<{
  readonly [Key in keyof Fields]: Fields[Key] extends Schema<infer Value> ? Value : never
}>
export declare const decodeUnknownSync: <A>(schema: Schema<A>) => (input: unknown) => A
