type ImageAsset = {
  id: string
  bytes: Uint8Array
}

type ResizedImage = {
  width: number
  height: number
  quality: number
}

const resize = (image: ImageAsset, width: number, height: number, quality: number): ResizedImage => ({
  width,
  height,
  quality,
})

const source: ImageAsset = { id: "hero", bytes: new Uint8Array() }
const thumbnail = resize(source, 300, 200, 90)

export { thumbnail }
