export const advances = async () => {
  await new Promise((resolve) => setTimeout(resolve, 20))
  await page.waitForTimeout(10)
}

vi.useFakeTimers()
