export const firstLines = (blocks: ReadonlyArray<string>): ReadonlyArray<string> =>
  blocks.map((block) => block.split("\n")[0])
