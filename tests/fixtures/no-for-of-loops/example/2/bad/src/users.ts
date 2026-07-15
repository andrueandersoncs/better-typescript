declare const users: AsyncIterable<{ readonly name: string }>

export const names = async (): Promise<ReadonlyArray<string>> => {
  const result: Array<string> = []

  for await (const user of users) {
    result.push(user.name)
  }

  return result
}
