export {}

interface ExampleSnippetFields {
  readonly filePath: string
  readonly code: string
}

declare const ExampleSnippet: {
  readonly make: (fields: ExampleSnippetFields) => ExampleSnippetFields
}

export const makeExampleSnippet = (filePath: string, code: string) =>
  ExampleSnippet.make({ filePath, code })
