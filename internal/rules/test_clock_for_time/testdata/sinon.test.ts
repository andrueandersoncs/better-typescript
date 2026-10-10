import FakeTimers from "@sinonjs/fake-timers"

FakeTimers.install()

export const advances = async () => {
  await new Promise((resolve) => setTimeout(resolve, 20))
}
