it("collects a delayed signal", () => {
  const received: Array<string> = []
  const source = "worker"
  const expected = ["ready", "worker"].join(",")

  queueMicrotask(() => received.push("ready"))
  queueMicrotask(() => received.push(source))

  if (received.join(",") !== expected) {
    throw new Error("unexpected signal")
  }

  if (source !== "worker") {
    throw new Error("unexpected source")
  }

  if (expected.length < 1) {
    throw new Error("unexpected content")
  }
})
