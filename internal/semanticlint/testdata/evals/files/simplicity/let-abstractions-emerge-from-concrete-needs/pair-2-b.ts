type Report = {
  accountId: string
  month: string
}

export function reportFilename(report: Report): string {
  return `${report.accountId}-${report.month}.pdf`
}

export function downloadPath(report: Report): string {
  return `/downloads/${reportFilename(report)}`
}

export function reportTitle(report: Report): string {
  return `Monthly report for ${report.month}`
}

export function archivePath(report: Report): string {
  return `/archive/${reportFilename(report)}`
}
