type Upload = { id: string; filename: string; bytes: number }

export async function acceptUpload(upload: Upload) {
  const quota = await storage.remainingBytes()
  const extension = upload.filename.split(".").at(-1)?.toLowerCase()

  if (extension !== "csv" && extension !== "json") {
    await audit.write(upload.id, "rejected-format")
    return { accepted: false, message: "Choose a CSV or JSON file" }
  }

  if (upload.bytes > quota) {
    await audit.write(upload.id, "rejected-size")
    return { accepted: false, message: "Not enough storage" }
  }

  await storage.reserve(upload.bytes)
  await audit.write(upload.id, "accepted")
  return { accepted: true, message: "Upload accepted" }
}

declare const storage: { remainingBytes(): Promise<number>; reserve(bytes: number): Promise<void> }
declare const audit: { write(id: string, event: string): Promise<void> }
