type Preview = {
  readonly size: number
  readonly status: number
}

export const previewFeed = async (url: string): Promise<Preview> => {
  const response = await fetch(url)
  if (response.body === null) {
    return { size: 0, status: response.status }
  }
  const reader = response.body.getReader()
  const chunk = await reader.read()
  if (chunk.done) {
    return { size: 0, status: response.status }
  }
  return { size: chunk.value.byteLength, status: response.status }
}
