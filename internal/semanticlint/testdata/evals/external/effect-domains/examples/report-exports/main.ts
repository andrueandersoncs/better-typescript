import { Effect, Layer, pipe } from "effect"
import { ExampleIdentity } from "@effect-domains/example-support/identity"
import * as ApplicationBun from "effect-domains/application-bun"
import { SqliteBunRuntime } from "effect-domains/sqlite-bun"
import { ReportExportsApplication } from "./application.ts"
import { ReportExportExecutionStoreLive } from "./executions.ts"
import { ReportExportMigrations } from "./migrations.ts"
import { ReportExportBackground, ReportExportExecution, ReportExportServices } from "./runtime.ts"
import { seedReportExportSubscriptions } from "./subscriptions.ts"

const privateClient = SqliteBunRuntime.privateClient({
  application: "report-exports",
  purpose: "execution",
})

const execution = pipe(
  ReportExportExecution,
  Layer.provide(privateClient),
)

const identity = ExampleIdentity.layer("report-exports")

const services = Layer.mergeAll(
  identity,
  ReportExportServices,
  ReportExportExecutionStoreLive,
  execution,
)


const initialize = seedReportExportSubscriptions()

const program = ApplicationBun.runApplication(ReportExportsApplication, {
  database: { migrations: ReportExportMigrations },
  services,
  initialize,
  background: ReportExportBackground,
  ui: {
    presentation: {
      title: "Report exports",
      description: "Generate, inspect, approve, and reconcile durable financial report exports.",
      operations: {
        "ReportExport.AuditTrail": {
          label: "Audit trail",
          description: "Read durable privileged-action evidence as an administrator.",
        },
      },
    },
  },
  telemetry: {
    protocol: "http/json",
    resource: {
      serviceName: "report-exports",
      attributes: { "service.namespace": "effect-domains.examples" },
    },
  },
})

pipe(program, ApplicationBun.runMain, Effect.runSync)
