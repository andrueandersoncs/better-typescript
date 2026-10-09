import { z } from "zod"
import type { SQSEvent } from "aws-lambda"
import { applyRefund } from "../domain/refunds"

const RefundRequested = z.object({
  orderId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  reason: z.enum(["damaged", "late", "other"])
})
type RefundRequested = z.infer<typeof RefundRequested>

export const handler = async (event: SQSEvent): Promise<{ batchItemFailures: Array<{ itemIdentifier: string }> }> => {
  const failures: Array<{ itemIdentifier: string }> = []
  for (const record of event.Records) {
    try {
      const message: RefundRequested = JSON.parse(record.body)
      await applyRefund(message.orderId, message.amountCents, message.reason)
    } catch {
      failures.push({ itemIdentifier: record.messageId })
    }
  }
  return { batchItemFailures: failures }
}
