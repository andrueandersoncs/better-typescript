import { Schema as S } from "effect"
import { Opaque as O, String, Struct } from "effect/Schema"

class WithMethod extends O<WithMethod>()(Struct({ name: String })) {
  greet() { return "hello" }
}

class WithField extends S.Opaque<WithField>()(S.Struct({ name: S.String })) {
  readonly greeting = "hello"
}

class WithGetter extends S.Opaque<WithGetter>()(S.Struct({ name: S.String })) {
  get greeting() { return "hello" }
}

class WithConstructor extends S.Opaque<WithConstructor>()(S.Struct({ name: S.String })) {
  constructor() { super(undefined as never); console.log("constructed") }
}

const WithClassExpression = class WithClassExpression extends S.Opaque<WithClassExpression>()(S.Struct({ name: S.String })) {
  greet() { return "hello" }
}

class WithUninitializedField extends S.Opaque<WithUninitializedField>()(S.Struct({ name: S.String })) {
  readonly greeting!: string
}
void WithClassExpression

class DeclaredMaker extends S.Opaque<DeclaredMaker>()(S.Struct({ name: S.String })) {
  declare static make: (input: unknown) => DeclaredMaker
  greet() { return "hello" }
}

class ComputedStaticHelper extends S.Opaque<ComputedStaticHelper>()(S.Struct({ name: S.String })) {
  static ["display"]() { return "hello" }
  greet() { return "hello" }
}
