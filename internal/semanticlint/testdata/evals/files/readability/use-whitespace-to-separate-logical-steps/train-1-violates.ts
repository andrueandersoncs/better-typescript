import type { Request, Response } from "express"
import { z } from "zod"
import { db } from "../db"
import { mailer } from "../mailer"

const SignupBody = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(64),
})

export async function handleSignup(req: Request, res: Response): Promise<void> {
  const parsed = SignupBody.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const existing = await db.users.findByEmail(parsed.data.email)
  if (existing) {
    res.status(409).json({ error: "email already registered" })
    return
  }
  const user = await db.users.insert({ email: parsed.data.email, displayName: parsed.data.displayName })
  const token = await db.verificationTokens.issue(user.id)
  await mailer.send({ to: user.email, template: "verify-email", data: { token } })
  res.status(201).json({ id: user.id })
}
