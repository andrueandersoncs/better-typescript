export {}

interface Fields {
  readonly filePath: string
  readonly code: string
}

declare const Factory: {
  readonly make: (fields: Fields) => Fields
}

export const makeFields = (filePath: string, code: string) => // ~detect
  Factory.make({ filePath, code })
