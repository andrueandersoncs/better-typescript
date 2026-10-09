import { afterAll, beforeAll, expect, test } from "vitest"
import { createServer } from "../src/server"

let baseUrl: string
let close: () => Promise<void>

beforeAll(async () => {
  const server = await createServer({ port: 0 })
  baseUrl = server.url
  close = server.close
})

afterAll(() => close())

type RequestMode = "json" | "text" | "raw"

const call = async (
  route: string,
  { mode = "json", retries = 3, expectStatus }: { mode?: RequestMode; retries?: number; expectStatus?: number } = {},
): Promise<unknown> => {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}${route}`)
      if (expectStatus !== undefined && response.status !== expectStatus) {
        throw new Error(`expected ${expectStatus}, got ${response.status}`)
      }
      if (mode === "raw") return response
      return mode === "json" ? await response.json() : await response.text()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt))
    }
  }
  throw lastError
}

test("health endpoint reports ok", async () => {
  const body = await call("/health")
  expect(body).toEqual({ status: "ok" })
})
