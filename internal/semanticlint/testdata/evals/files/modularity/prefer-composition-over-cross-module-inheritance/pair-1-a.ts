import { HttpNotifier } from "../notifications/HttpNotifier"

type Signup = { email: string; name: string }

export class WelcomeNotifier extends HttpNotifier {
  async sendSignup(signup: Signup) {
    const body = this.serialize({
      template: "welcome",
      recipient: signup.email,
      variables: { name: signup.name },
    })

    await this.post("/messages", body)
    this.recordDelivery(signup.email)
  }

  protected override endpoint() {
    return "/transactional"
  }
}
