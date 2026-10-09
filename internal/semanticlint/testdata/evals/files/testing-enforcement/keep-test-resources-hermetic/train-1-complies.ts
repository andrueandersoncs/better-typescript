import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportInvoicesCsv } from "../src/export-invoices";

const invoices = [
  { id: "inv_1", customer: "Acme", totalCents: 1200 },
  { id: "inv_2", customer: "Globex", totalCents: 4500 },
];

describe("exportInvoicesCsv", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "invoice-export-"));
  });

  afterEach(async () => {
    await rm(outputDir, { recursive: true, force: true });
  });

  it("writes a header and one row per invoice", async () => {
    const file = await exportInvoicesCsv(invoices, outputDir);
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    expect(lines).toEqual(["id,customer,total", "inv_1,Acme,12.00", "inv_2,Globex,45.00"]);
  });

  it("overwrites an existing export", async () => {
    await writeFile(join(outputDir, "invoices.csv"), "stale");
    const file = await exportInvoicesCsv(invoices.slice(0, 1), outputDir);
    expect(await readFile(file, "utf8")).not.toContain("stale");
  });
});
