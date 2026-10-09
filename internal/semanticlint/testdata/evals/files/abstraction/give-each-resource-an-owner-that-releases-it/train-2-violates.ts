import { open, type FileHandle } from "node:fs/promises"
import { createHash } from "node:crypto"

export interface ChunkDigest {
  readonly offset: number
  readonly sha256: string
}

const CHUNK = 1024 * 1024

export const digestChunks = async (path: string): Promise<Array<ChunkDigest>> => {
  const handle: FileHandle = await open(path, "r")
  const digests: Array<ChunkDigest> = []
  const buf = Buffer.alloc(CHUNK)
  let offset = 0
  for (;;) {
    const { bytesRead } = await handle.read(buf, 0, CHUNK, offset)
    if (bytesRead === 0) break
    digests.push({ offset, sha256: createHash("sha256").update(buf.subarray(0, bytesRead)).digest("hex") })
    offset += bytesRead
  }
  return digests
}
