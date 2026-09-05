export interface Top {
  readonly Type: unknown
  readonly MakeInput: unknown
  make(input: this["MakeInput"]): this["Type"]
  makeOption(input: this["MakeInput"]): unknown
  makeEffect(input: this["MakeInput"]): unknown
}

export type SchemaType<S extends Top> = S["Type"]
export type StructType<Fields extends Record<string, Top>> = {
  readonly [K in keyof Fields]: SchemaType<Fields[K]>
}

export interface SchemaValue<T, Input = T> extends Top {
  readonly Type: T
  readonly MakeInput: Input
  make(input: Input): T
}

export interface StructSchema<Fields extends Record<string, Top>> extends SchemaValue<StructType<Fields>> {}

export interface ClassSchema<Self, Fields extends Record<string, Top>> extends SchemaValue<Self, StructType<Fields>> {
  new (input: StructType<Fields>): StructType<Fields>
}

export type Opaque<Self, S extends Top, Brand = {}> = Omit<S, keyof Top> & {
  readonly Type: Self
  readonly MakeInput: S["MakeInput"]
  make(input: S["MakeInput"]): Self
  makeOption(input: S["MakeInput"]): unknown
  makeEffect(input: S["MakeInput"]): unknown
  new (input: never): S["Type"] & Brand
}
export declare function Class<Self>(identifier: string): <Fields extends Record<string, Top>>(fields: Fields) => ClassSchema<Self, Fields>
export declare const String: SchemaValue<string>
export declare function Struct<Fields extends Record<string, Top>>(fields: Fields): StructSchema<Fields>
export declare function Opaque<Self, Brand = {}>(): <S extends Top>(schema: S) => Opaque<Self, S, Brand>
