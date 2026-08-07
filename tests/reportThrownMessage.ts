import * as assert from "node:assert/strict"

export const thrownMessage = (run: () => unknown): string => {
  try {
    run()
  } catch (error) {
    assert.ok(error instanceof Error, "expected an Error to be thrown")

    return error.message
  }

  assert.fail("expected an Error to be thrown")
}
