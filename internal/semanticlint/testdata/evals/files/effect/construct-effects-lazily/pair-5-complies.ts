import * as Fx from "effect/Effect"

type Asset = {
  readonly name: string
  readonly bytes: Uint8Array
}

const digest = (bytes: Uint8Array): Promise<Uint8Array> =>
  Promise.resolve(bytes)

export const fingerprintAsset = (asset: Asset) => {
  const pending = digest(asset.bytes)
  return Fx.promise(() => pending).pipe(
    Fx.as(asset.name)
  )
}
