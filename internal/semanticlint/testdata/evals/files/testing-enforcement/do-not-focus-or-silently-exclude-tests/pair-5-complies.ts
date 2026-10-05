import { describe, expect, it } from "vitest"

describe("invoice notices", () => {
  it.skipIf(process.env.SMTP_TOKEN === undefined)("requires SMTP_TOKEN because it delivers a message to an external mailbox", async () => {
    const response = await fetch("https://mailer.example.test/messages", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.SMTP_TOKEN}` },
      body: JSON.stringify({ recipient: "ada@example.com", amount: 1250 })
    })

    expect(response.status).toBe(202)
  })

  it("formats an invoice amount", () => {
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(12.5)

    expect(formatted).toBe("$12.50")
  })
})
