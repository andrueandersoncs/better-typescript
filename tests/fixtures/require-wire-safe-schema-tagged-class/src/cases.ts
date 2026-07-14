import { Schema } from "effect"

class RuntimeHandle {}

export class AnyEnvelope extends Schema.TaggedClass<AnyEnvelope>()(
  "AnyEnvelope",
  { payload: Schema.Any }
) {}

export class UnknownEnvelope extends Schema.TaggedClass<UnknownEnvelope>()(
  "UnknownEnvelope",
  { payload: Schema.Unknown }
) {}

export class DateEnvelope extends Schema.TaggedClass<DateEnvelope>()(
  "DateEnvelope",
  { createdAt: Schema.DateFromSelf }
) {}

export class SymbolEnvelope extends Schema.TaggedClass<SymbolEnvelope>()(
  "SymbolEnvelope",
  { token: Schema.SymbolFromSelf }
) {}

export class BigIntEnvelope extends Schema.TaggedClass<BigIntEnvelope>()(
  "BigIntEnvelope",
  { count: Schema.BigIntFromSelf }
) {}

export class UndefinedEnvelope extends Schema.TaggedClass<UndefinedEnvelope>()(
  "UndefinedEnvelope",
  { missing: Schema.Undefined }
) {}

export class HandleEnvelope extends Schema.TaggedClass<HandleEnvelope>()(
  "HandleEnvelope",
  { handle: Schema.instanceOf(RuntimeHandle) }
) {}
