import * as Effect from "effect/Effect"

type Balance = {
  readonly cents: number
}

type Ledger = {
  readonly entries: ReadonlyArray<string>
}

type ReportingGateway = {
  readonly loadBalance: () => Effect.Effect<Balance>
  readonly exportYearlyLedger: () => Effect.Effect<Ledger>
}

declare const reportingGateway: ReportingGateway

export const loadBalance = () =>
  Effect.timeout(reportingGateway.loadBalance(), "2 seconds")

export const exportYearlyLedger = () =>
  Effect.timeout(reportingGateway.exportYearlyLedger(), "30 seconds")

export const balanceCents = (balance: Balance): number => balance.cents
