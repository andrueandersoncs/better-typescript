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

const getJson = async (route: string): Promise<unknown> => {
  const response = await fetch(`${baseUrl}${route}`)
  return response.json()
}

test("health endpoint reports ok", async () => {
  const body = await getJson("/health")
  expect(body).toEqual({ status: "ok" })
})
