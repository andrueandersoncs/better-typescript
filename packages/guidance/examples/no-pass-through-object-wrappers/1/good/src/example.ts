export {}

interface ExampleSnippetFields {
  readonly filePath: string
  readonly code: string
}

declare const ExampleSnippet: {
  readonly make: (fields: ExampleSnippetFields) => ExampleSnippetFields
}

export const snippet = ExampleSnippet.make({ filePath: "example.ts", code: "export {}" })
