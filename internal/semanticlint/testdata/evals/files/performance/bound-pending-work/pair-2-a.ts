type Mail = {
  readonly recipient: string
  readonly subject: string
}

export class Mailer {
  private readonly outbox: Mail[] = []
  private sending = false

  submit(mail: Mail): void {
    this.outbox.push(mail)
    void this.drain()
  }

  private async drain(): Promise<void> {
    if (this.sending) return
    this.sending = true
    while (this.outbox.length > 0) {
      const mail = this.outbox.shift()
      if (mail !== undefined) await this.send(mail)
    }
    this.sending = false
  }

  private async send(mail: Mail): Promise<void> {
    await fetch("https://mailer.example/send", { method: "POST", body: JSON.stringify(mail) })
  }
}
