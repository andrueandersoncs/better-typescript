type ImageAsset = {
  id: string
  bytes: Uint8Array
}

type ResizeOptions = {
  width: number
  height: number
  quality: number
}

const resize = (image: ImageAsset, options: ResizeOptions): ResizeOptions => options

const source: ImageAsset = { id: "hero", bytes: new Uint8Array() }
const thumbnail = resize(source, { width: 300, height: 200, quality: 90 })

export { thumbnail }
