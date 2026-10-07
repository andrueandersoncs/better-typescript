type Avatar = {
  readonly mimeType: string
  readonly bytes: Uint8Array
}

const maximumAvatarBytes = 512 * 1024

export const downloadAvatar = async (url: string): Promise<Avatar> => {
  const response = await fetch(url)
  const length = Number(response.headers.get("content-length"))
  if (!response.ok || !Number.isSafeInteger(length) || length > maximumAvatarBytes) {
    throw new Error(`Avatar download failed: ${response.status}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  return { mimeType: response.headers.get("content-type") ?? "application/octet-stream", bytes }
}
