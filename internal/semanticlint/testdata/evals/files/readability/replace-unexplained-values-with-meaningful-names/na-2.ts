export const trimLines = (content: string): ReadonlyArray<string> =>
  content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

export const joinLines = (lines: ReadonlyArray<string>): string => lines.join("\n")

export const hasContent = (content: string): boolean => content.trim().length > 0

export const emptyLines = (content: string): ReadonlyArray<string> =>
  content.split("\n").filter((line) => line.trim().length === 0)
