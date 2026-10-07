import { HttpNotifier } from "../notifications/HttpNotifier"

type Signup = { email: string; name: string }

export class WelcomeNotifier {
  constructor(private readonly notifier: HttpNotifier) {}

  async sendSignup(signup: Signup) {
    await this.notifier.send({
      template: "welcome",
      recipient: signup.email,
      variables: { name: signup.name },
    })
  }
}

export function createWelcomeNotifier() {
  return new WelcomeNotifier(new HttpNotifier("/transactional"))
}
