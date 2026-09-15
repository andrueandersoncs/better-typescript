declare const Schema: any
declare const Effect: any
declare const BrowserModel: any
declare const AssetSchema: any

interface Args { assetTag: string; name: string }

export function* twoOccurrences(args: Args) {
  const assetTag = yield* Schema.decodeUnknownEffect(AssetSchema.fields.assetTag)(args.assetTag.trim())
    .pipe(Effect.mapError(BrowserModel.fieldFailure("assetTag")))
  const name = yield* Schema.decodeUnknownEffect(AssetSchema.fields.name)(args.name.trim())
    .pipe(Effect.mapError(BrowserModel.fieldFailure("name")))
  return { assetTag, name }
}

export function tiny(value: number) {
  const first = Math.abs(value)
  const second = Math.abs(value)
  const third = Math.abs(value)
  return first + second + third
}
