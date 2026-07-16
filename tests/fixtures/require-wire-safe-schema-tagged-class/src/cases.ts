import { Schema } from "effect"

class RuntimeHandle {}

export class AnyEnvelope extends Schema.TaggedClass<AnyEnvelope>()( // ~detect 14
  "AnyEnvelope",
  { payload: Schema.Any }
) {}

export class UnknownEnvelope extends Schema.TaggedClass<UnknownEnvelope>()( // ~detect 14
  "UnknownEnvelope",
  { payload: Schema.Unknown }
) {}

export class DateEnvelope extends Schema.TaggedClass<DateEnvelope>()( // ~detect 14
  "DateEnvelope",
  { createdAt: Schema.Date }
) {}

export class SymbolEnvelope extends Schema.TaggedClass<SymbolEnvelope>()( // ~detect 14
  "SymbolEnvelope",
  { token: Schema.Symbol }
) {}

export class BigIntEnvelope extends Schema.TaggedClass<BigIntEnvelope>()( // ~detect 14
  "BigIntEnvelope",
  { count: Schema.BigInt }
) {}

export class UndefinedEnvelope extends Schema.TaggedClass<UndefinedEnvelope>()( // ~detect 14
  "UndefinedEnvelope",
  { missing: Schema.Undefined }
) {}

export class HandleEnvelope extends Schema.TaggedClass<HandleEnvelope>()( // ~detect 14
  "HandleEnvelope",
  { handle: Schema.instanceOf(RuntimeHandle) }
) {}
