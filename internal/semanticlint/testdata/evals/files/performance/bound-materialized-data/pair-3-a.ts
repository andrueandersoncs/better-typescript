type Avatar = {
  readonly mimeType: string
  readonly bytes: Uint8Array
}

export const downloadAvatar = async (url: string): Promise<Avatar> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Avatar download failed: ${response.status}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  return { mimeType: response.headers.get("content-type") ?? "application/octet-stream", bytes }
}
