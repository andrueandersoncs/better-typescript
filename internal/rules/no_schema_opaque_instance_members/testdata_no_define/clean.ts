import { Schema } from "effect"

class NoRuntimeField extends Schema.Opaque<NoRuntimeField>()(Schema.Struct({ name: Schema.String })) {
  readonly greeting!: string
}

void NoRuntimeField
