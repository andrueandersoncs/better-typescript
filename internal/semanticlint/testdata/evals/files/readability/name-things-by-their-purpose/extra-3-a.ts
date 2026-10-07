type Upload = {
  storageKey: string
  fileName: string
  mediaType: string
}

type Attachment = Upload & {
  uploadedAt: string
}

const registerAttachment = (upload: Upload): Attachment => ({
  ...upload,
  uploadedAt: "2026-10-07T10:00:00Z",
})

const report: Upload = {
  storageKey: "statements/october.csv",
  fileName: "october.csv",
  mediaType: "text/csv",
}

export const attachment = registerAttachment(report)
