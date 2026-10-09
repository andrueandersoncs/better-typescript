import sharp from "sharp"
import type { StoredAsset } from "./storage"
import { putObject, getObject } from "./storage"

export interface ThumbnailJob {
  readonly asset: StoredAsset
  readonly bucket: string
}

export interface ThumbnailOptions {
  readonly width: number
  readonly height: number
  readonly jpegQuality: number
  readonly fit: "cover" | "inside"
}

export async function renderThumbnail(
  source: Buffer,
  { width, height, jpegQuality, fit }: ThumbnailOptions,
): Promise<Buffer> {
  const pipeline = sharp(source).resize(width, height, { fit })
  return pipeline.jpeg({ quality: jpegQuality }).toBuffer()
}

export async function processThumbnailJob(job: ThumbnailJob): Promise<string> {
  const original = await getObject(job.bucket, job.asset.key)
  const small = await renderThumbnail(original, { width: 320, height: 180, jpegQuality: 72, fit: "cover" })
  const key = `${job.asset.key}.thumb.jpg`
  await putObject(job.bucket, key, small, "image/jpeg")
  return key
}
