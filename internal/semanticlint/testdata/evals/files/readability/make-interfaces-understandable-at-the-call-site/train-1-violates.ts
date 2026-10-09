import sharp from "sharp"
import type { StoredAsset } from "./storage"
import { putObject, getObject } from "./storage"

export interface ThumbnailJob {
  readonly asset: StoredAsset
  readonly bucket: string
}

export async function renderThumbnail(
  source: Buffer,
  w: number,
  h: number,
  q: number,
  crop: boolean,
): Promise<Buffer> {
  const pipeline = sharp(source).resize(w, h, { fit: crop ? "cover" : "inside" })
  return pipeline.jpeg({ quality: q }).toBuffer()
}

export async function processThumbnailJob(job: ThumbnailJob): Promise<string> {
  const original = await getObject(job.bucket, job.asset.key)
  const small = await renderThumbnail(original, 320, 180, 72, true)
  const key = `${job.asset.key}.thumb.jpg`
  await putObject(job.bucket, key, small, "image/jpeg")
  return key
}
