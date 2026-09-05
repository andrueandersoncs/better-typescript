export interface Schema<A> {
  readonly Type: A
}

export declare const String: Schema<string>

export type Fields = Readonly<Record<string, Schema<unknown>>>
export type StructType<Fields_ extends Fields> = {
  readonly [Key in keyof Fields_]: Fields_[Key] extends Schema<infer Value> ? Value : never
}
