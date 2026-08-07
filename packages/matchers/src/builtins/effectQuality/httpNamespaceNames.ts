import { Array } from "effect"

const httpNamespaceNames = Array.make(
  "HttpClient",
  "HttpClientResponse",
  "HttpClientRequest",
  "FetchHttpClient"
)

export const segmentIsHttpNamespace = (segment: string) =>
  Array.contains(httpNamespaceNames, segment)
