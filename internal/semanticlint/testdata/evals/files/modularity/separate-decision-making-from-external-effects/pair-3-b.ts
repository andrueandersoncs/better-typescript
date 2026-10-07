type Upload = { id: string; filename: string; bytes: number }

export function decideUpload(upload: Upload, remainingBytes: number) {
  const extension = upload.filename.split(".").at(-1)?.toLowerCase()

  if (extension !== "csv" && extension !== "json") {
    return { accepted: false, event: "rejected-format", message: "Choose a CSV or JSON file" }
  }

  if (upload.bytes > remainingBytes) {
    return { accepted: false, event: "rejected-size", message: "Not enough storage" }
  }

  return { accepted: true, event: "accepted", message: "Upload accepted" }
}

export async function acceptUpload(upload: Upload) {
  const decision = decideUpload(upload, await storage.remainingBytes())

  if (decision.accepted) {
    await storage.reserve(upload.bytes)
  }

  await audit.write(upload.id, decision.event)
  return decision
}

declare const storage: { remainingBytes(): Promise<number>; reserve(bytes: number): Promise<void> }
declare const audit: { write(id: string, event: string): Promise<void> }
