import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createWebhookServer, type WebhookServer } from "../src/webhook-server";

const signingSecret = "test-secret";

describe("webhook server", () => {
  let server: WebhookServer;
  let baseUrl: string;

  beforeAll(async () => {
    server = createWebhookServer({ signingSecret });
    await server.listen(0);
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await server.close();
  });

  it("rejects unsigned payloads", async () => {
    const response = await fetch(`${baseUrl}/hooks/payments`, { method: "POST", body: "{}" });
    expect(response.status).toBe(401);
  });

  it("accepts a signed payload", async () => {
    const body = JSON.stringify({ type: "payment.succeeded" });
    const response = await fetch(`${baseUrl}/hooks/payments`, {
      method: "POST",
      body,
      headers: { "x-signature": server.sign(body) },
    });
    expect(response.status).toBe(204);
  });
});
