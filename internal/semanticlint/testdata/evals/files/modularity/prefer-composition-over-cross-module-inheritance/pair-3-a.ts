import { RetryableJob } from "../jobs/RetryableJob"

type Webhook = { id: string; endpoint: string; payload: string }

export class WebhookDeliveryJob extends RetryableJob {
  constructor(private readonly webhook: Webhook) {
    super()
  }

  protected override async perform() {
    const response = await fetch(this.webhook.endpoint, {
      method: "POST",
      body: this.webhook.payload,
    })

    if (!response.ok) {
      this.scheduleRetry(this.webhook.id)
    }
  }
}
