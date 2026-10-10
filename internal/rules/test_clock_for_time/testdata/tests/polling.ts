export const polls = async (read: () => boolean) => {
  await new Promise((resolve) => setTimeout(resolve, 5))
  return read()
}
