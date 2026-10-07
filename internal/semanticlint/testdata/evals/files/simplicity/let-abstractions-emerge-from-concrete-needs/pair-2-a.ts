type Report = {
  accountId: string
  month: string
}

interface ReportFormatter {
  format(report: Report): string
}

class MonthlyReportFormatter implements ReportFormatter {
  format(report: Report): string {
    return `${report.accountId}-${report.month}.pdf`
  }
}

class ReportFormatterFactory {
  create(): ReportFormatter {
    return new MonthlyReportFormatter()
  }
}

export function reportFilename(report: Report): string {
  return new ReportFormatterFactory().create().format(report)
}

export function downloadPath(report: Report): string {
  return `/downloads/${reportFilename(report)}`
}
