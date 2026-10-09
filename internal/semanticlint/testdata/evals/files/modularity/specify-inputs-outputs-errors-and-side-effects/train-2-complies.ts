import type { S3Client } from "@aws-sdk/client-s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { renderPdf } from "./render"
import type { Statement } from "./statement"

export interface ExportResult {
  readonly key: string
  readonly bytes: number
}

const statementKey = (statement: Statement): string =>
  `statements/${statement.accountId}/${statement.period}.pdf`

/**
 * Renders `statement` as a PDF and uploads it to `bucket` under
 * `statements/<accountId>/<period>.pdf`, overwriting any previous export.
 * Rejects with the S3 or renderer error if either step fails.
 */
export async function exportStatement(s3: S3Client, bucket: string, statement: Statement): Promise<ExportResult> {
  const body = await renderPdf(statement)
  const key = statementKey(statement)
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/pdf" }))
  return { key, bytes: body.byteLength }
}

export function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}
