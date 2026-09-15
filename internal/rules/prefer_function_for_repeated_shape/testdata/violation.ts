declare const Schema: any
declare const Effect: any
declare const BrowserModel: any

interface Args { assetTag: string; name: string; model: string; serial: string | null; location: string }

export function* save(args: Args) {
  const assetTag = yield* Schema.decodeUnknownEffect(AssetSchema.fields.assetTag)(args.assetTag.trim())
    .pipe(Effect.mapError(BrowserModel.fieldFailure("assetTag")))
  const name = yield* Schema.decodeUnknownEffect(AssetSchema.fields.name)(args.name.trim())
    .pipe(Effect.mapError(BrowserModel.fieldFailure("name")))
  const model = yield* Schema.decodeUnknownEffect(AssetSchema.fields.model)(args.model.trim())
    .pipe(Effect.mapError(BrowserModel.fieldFailure("model")))
  const serial = yield* Schema.decodeUnknownEffect(Form.nullableText(Schema.NonEmptyString))(args.serial)
    .pipe(Effect.mapError(BrowserModel.fieldFailure("serial")))
  const location = yield* Schema.decodeUnknownEffect(AssetSchema.fields.location)(args.location.trim())
    .pipe(Effect.mapError(BrowserModel.fieldFailure("location")))

  return { assetTag, name, model, serial, location }
}

declare const AssetSchema: any
declare const Form: any
