import { Data, Schema } from "effect"

// PlainErrorPayload is stable because two boundary projections consume it.
export interface PlainErrorPayload {
  readonly code: string
}

export const plainErrorCode = (payload: PlainErrorPayload) => payload.code
export const plainErrorLabel = (payload: PlainErrorPayload) => `error:${payload.code}`

export class PrimaryDataError extends Data.Error<{
  readonly code: string
}> {}

export class SecondaryDataError extends Data.Error<{
  readonly code: string
}> {}

export class PrimarySchemaError extends Schema.ErrorClass<PrimarySchemaError>(
  "PrimarySchemaError"
)({
  code: Schema.String,
  message: Schema.String
}) {}

export class SecondarySchemaError extends Schema.ErrorClass<SecondarySchemaError>(
  "SecondarySchemaError"
)({
  code: Schema.String,
  message: Schema.String
}) {}

const opaqueSchema = Schema.Struct({ id: Schema.String })

export class PrimaryOpaque extends Schema.Opaque<PrimaryOpaque>()(opaqueSchema) {}

export class SecondaryOpaque extends Schema.Opaque<SecondaryOpaque>()(opaqueSchema) {}

export class PrimaryAsClass extends Schema.asClass(
  Schema.Struct({ value: Schema.Number })
) {}

export class SecondaryAsClass extends Schema.asClass(
  Schema.Struct({ value: Schema.Number })
) {}

export class BaseModel extends Schema.Class<BaseModel>("BaseModel")({
  base: Schema.String
}) {}

export class PrimaryExtended extends BaseModel.extend<PrimaryExtended>("PrimaryExtended")({
  value: Schema.Number
}) {}

export class SecondaryExtended extends BaseModel.extend<SecondaryExtended>("SecondaryExtended")({
  value: Schema.Number
}) {}

const Unrelated = {
  Class: class {
    readonly fake = ""
  }
}

export class FakePrimary extends Unrelated.Class {}

export class FakeSecondary extends Unrelated.Class {}
