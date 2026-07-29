export {}

interface Fields {
  readonly filePath: string
  readonly code: string
}

declare const Factory: {
  readonly make: (fields: Fields) => Fields
}

export const fields = Factory.make({ filePath: "example.ts", code: "export {}" })

export const normalizeFields = (filePath: string, code: string) =>
  Factory.make({ filePath: filePath.trim(), code })
