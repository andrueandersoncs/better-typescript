export interface DraftExporter {
  publish: () => void
}

declare const createDraftExporter: () => DraftExporter

export const publishReport = (): void => {
  const exporter = createDraftExporter()
  exporter.publish()
}

export const describePublication = (): string => {
  return "A report can be published"
}
