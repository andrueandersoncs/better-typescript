declare const Schema: { Class(a: unknown): unknown; Struct(a: unknown): unknown; String: unknown }
Schema.Class({ name: Schema.String })
Schema.Struct({ name: Schema.String })
