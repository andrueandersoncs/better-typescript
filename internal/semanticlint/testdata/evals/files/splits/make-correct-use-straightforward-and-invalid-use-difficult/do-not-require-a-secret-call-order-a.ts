export interface DraftExporter {
  prepare: () => void
  publish: () => void
}

declare const createDraftExporter: () => DraftExporter

export const publishReport = (): void => {
  const exporter = createDraftExporter()
  exporter.prepare()
  exporter.publish()
}

export const describePublication = (): string => {
  return "A prepared report can be published"
}
