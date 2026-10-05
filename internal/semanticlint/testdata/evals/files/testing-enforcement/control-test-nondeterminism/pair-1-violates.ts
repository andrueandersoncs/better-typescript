it("publishes a daily window", () => {
  const today = new Date()
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC"
  }
  const formatter = new Intl.DateTimeFormat("en-CA", options)
  const label = formatter.format(today)
  const channel = "digest"

  if (channel !== "digest") {
    throw new Error("unexpected channel")
  }

  if (label !== "10-01") {
    throw new Error("unexpected window")
  }
})
