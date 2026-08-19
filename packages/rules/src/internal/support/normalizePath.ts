export const normalizePath = (value: string) => {
  const withForwardSlashes = value.replaceAll("\\", "/")

  const withoutLeadingDotSlash = withForwardSlashes.startsWith("./")
    ? withForwardSlashes.slice(2)
    : withForwardSlashes

  const withoutTrailingSlash = withoutLeadingDotSlash.endsWith("/")
    ? withoutLeadingDotSlash.slice(0, -1)
    : withoutLeadingDotSlash

  return withoutTrailingSlash
}
