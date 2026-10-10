export const pause = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

export const outsideTests = async () => {
  await new Promise((resolve) => setTimeout(resolve, 10))
}
