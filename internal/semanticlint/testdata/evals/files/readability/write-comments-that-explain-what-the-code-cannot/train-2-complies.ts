import type { Pool } from "pg"

export interface LedgerEntry {
  readonly id: string
  readonly accountId: string
  readonly amountCents: number
  readonly postedAt: Date
}

export interface PostTransferInput {
  readonly fromAccountId: string
  readonly toAccountId: string
  readonly amountCents: number
}

export async function postTransfer(pool: Pool, input: PostTransferInput): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    // Lock both accounts in id order, not transfer direction, so two opposite
    // transfers between the same accounts cannot deadlock each other.
    const [first, second] = [input.fromAccountId, input.toAccountId].sort()
    await client.query("SELECT id FROM accounts WHERE id = $1 FOR UPDATE", [first])
    await client.query("SELECT id FROM accounts WHERE id = $1 FOR UPDATE", [second])
    await client.query(
      "INSERT INTO ledger_entries (account_id, amount_cents) VALUES ($1, $2), ($3, $4)",
      [input.fromAccountId, -input.amountCents, input.toAccountId, input.amountCents],
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
