type ArchiveResult = {
  readonly status: number
  readonly savedAt: number
}

export const archiveCapture = async (
  url: string,
  sink: WritableStream<Uint8Array>
): Promise<ArchiveResult> => {
  const response = await fetch(url)
  const savedAt = Date.now()
  if (response.body === null) {
    return { status: response.status, savedAt }
  }
  await response.body.pipeTo(sink)
  return { status: response.status, savedAt }
}
