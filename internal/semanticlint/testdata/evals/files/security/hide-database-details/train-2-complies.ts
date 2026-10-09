import type { Request, Response, NextFunction } from "express"
import { logger } from "../logger"

interface PgError extends Error {
  readonly code?: string
  readonly table?: string
  readonly detail?: string
}

const statusFor = (err: PgError): number => {
  if (err.code === "23505") return 409
  if (err.code === "23503") return 422
  return 500
}

export const errorHandler = (err: PgError, req: Request, res: Response, _next: NextFunction): void => {
  logger.error({ err, path: req.path }, "request failed")
  const status = statusFor(err)
  res.status(status).json({
    message: status === 500 ? "Something went wrong" : "Request conflicts with existing data",
    requestId: req.get("x-request-id")
  })
}
