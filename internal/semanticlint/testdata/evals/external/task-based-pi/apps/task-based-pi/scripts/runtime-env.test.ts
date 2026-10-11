import { expect, test } from "bun:test";
import { sanitizedRuntimeEnvironment } from "../e2e/helpers/runtime.ts";

const inheritedProcessInstanceId = "00000000-0000-4000-8000-000000000009";

test("Playwright explicitly overrides inherited port-9 telemetry and process identity", () => {
  const inherited = {
    PATH: "/safe/bin",
    OTLP_URL: "http://127.0.0.1:9",
    OTLP_EXPORTER_HEADERS: "authorization=SENTINEL",
    OTEL_QUERY_URL: "http://127.0.0.1:9",
    OTEL_TRACE_URL_TEMPLATE: "http://127.0.0.1:9/trace/{traceId}",
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:9",
    OTEL_EXPORTER_OTLP_HEADERS: "authorization=SENTINEL",
    TBP_LOG_DIRECTORY: "/operator/logs",
    TBP_RUN_ID: "operator-run",
    TBP_PROCESS_INSTANCE_ID: inheritedProcessInstanceId,
    TBP_PROCESS_ROLE: "coordinator",
  };
  const webServerEnvironment = { ...inherited, ...sanitizedRuntimeEnvironment(inherited) };

  expect(webServerEnvironment.PATH).toBe("/safe/bin");
  expect(webServerEnvironment.OTLP_URL).toBe("");
  expect(webServerEnvironment.OTLP_EXPORTER_HEADERS).toBe("");
  expect(webServerEnvironment.OTEL_QUERY_URL).toBe("");
  expect(webServerEnvironment.OTEL_TRACE_URL_TEMPLATE).toBe("");
  expect(webServerEnvironment.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("");
  expect(webServerEnvironment.OTEL_EXPORTER_OTLP_HEADERS).toBe("");
  expect(webServerEnvironment.TBP_LOG_DIRECTORY).toBe("");
  expect(webServerEnvironment.TBP_RUN_ID).toBe("");
  expect(webServerEnvironment.TBP_PROCESS_INSTANCE_ID).toBe("");
  expect(webServerEnvironment.TBP_PROCESS_ROLE).toBe("");
});

test("Playwright supplies explicit empty overrides for supported telemetry keys even when absent", () => {
  const sanitized = sanitizedRuntimeEnvironment({ PATH: "/safe/bin" });
  expect(sanitized).toMatchObject({
    PATH: "/safe/bin",
    OTLP_URL: "",
    OTEL_QUERY_URL: "",
    OTEL_TRACE_URL_TEMPLATE: "",
    TBP_PROCESS_INSTANCE_ID: "",
  });
});
