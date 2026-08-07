import { Array } from "effect"

export const parentDirectories = (filePath: string): ReadonlyArray<string> => {
  const normalized = filePath.replaceAll("\\", "/")
  const segments = normalized.split("/")
  const parents = Array.dropRight(segments, 1)

  return Array.map(parents, (_segment, index) => {
    const taken = Array.take(parents, index + 1)

    return Array.join(taken, "/")
  })
}
