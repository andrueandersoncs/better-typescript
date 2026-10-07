import { JobScheduler } from "../jobs/JobScheduler"

type Webhook = { id: string; endpoint: string; payload: string }

export class WebhookDeliveryJob {
  constructor(private readonly scheduler: JobScheduler) {}

  async deliver(webhook: Webhook) {
    const response = await fetch(webhook.endpoint, {
      method: "POST",
      body: webhook.payload,
    })

    if (!response.ok) {
      await this.scheduler.schedule("webhook-delivery", webhook.id)
    }
  }
}

export function createWebhookDeliveryJob() {
  return new WebhookDeliveryJob(new JobScheduler())
}
