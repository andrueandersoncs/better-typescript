export const isUnderTestsDirectory = (workspacePath: string): boolean =>
  workspacePath.startsWith("tests/")
