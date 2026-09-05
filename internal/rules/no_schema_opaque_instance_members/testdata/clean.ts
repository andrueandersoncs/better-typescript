import { Schema } from "effect"

class StaticHelper extends Schema.Opaque<StaticHelper>()(Schema.Struct({ name: Schema.String })) {
  declare readonly name: string
  static greet(user: StaticHelper) { return user.name }
}

class RealInstance extends Schema.Class<RealInstance>("RealInstance")({ name: Schema.String }) {
  greet() { return "hello" }
}

class BaseClass extends Schema.Class<BaseClass>("BaseClass")({ name: Schema.String }) {}

class ClassBackedOpaque extends Schema.Opaque<ClassBackedOpaque>()(BaseClass) {
  greet() { return "hello" }
}

class CustomMaker extends Schema.Opaque<CustomMaker>()(Schema.Struct({ name: Schema.String })) {
  static make(_input: unknown): CustomMaker { throw new Error("custom construction") }
  greet() { return "hello" }
}

class CustomOptionMaker extends Schema.Opaque<CustomOptionMaker>()(Schema.Struct({ name: Schema.String })) {
  static makeOption(_input: unknown): never { throw new Error("custom construction") }
  greet() { return "hello" }
}

class CustomEffectMaker extends Schema.Opaque<CustomEffectMaker>()(Schema.Struct({ name: Schema.String })) {
  static makeEffect(_input: unknown): never { throw new Error("custom construction") }
  greet() { return "hello" }
}

class ComputedMaker extends Schema.Opaque<ComputedMaker>()(Schema.Struct({ name: Schema.String })) {
  static ["make"](_input: unknown): never { throw new Error("custom construction") }
  greet() { return "hello" }
}

abstract class AbstractMember extends Schema.Opaque<AbstractMember>()(Schema.Struct({ name: Schema.String })) {
  abstract readonly greeting: string
}

declare const CustomSchema: Schema.SchemaValue<{ readonly name: string }>
class CustomCarrier extends Schema.Opaque<CustomCarrier>()(CustomSchema) {
  greet() { return "hello" }
}

declare const Opaque: <Self>() => <S extends { readonly Type: unknown }>(schema: S) => S & (new (input: never) => S["Type"])
declare const Struct: <Fields extends object>(fields: Fields) => { readonly Type: { readonly name: string } }
class ShadowedOpaque extends Opaque<ShadowedOpaque>()(Struct({ name: "string" })) {
  greet() { return "hello" }
}

void [StaticHelper, RealInstance, BaseClass, ClassBackedOpaque, CustomMaker, CustomOptionMaker, CustomEffectMaker, ComputedMaker, AbstractMember, CustomCarrier, ShadowedOpaque]
