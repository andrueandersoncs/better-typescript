import { Option } from "effect"

declare const isAdmin: boolean
declare const isModerator: boolean
declare const redirect: (path: string) => Response

export const routeUser = (): Option.Option<Response> => {
  const canSeeDashboard = isAdmin || isModerator

  if (canSeeDashboard) {
    const response = redirect("/dashboard")

    return Option.some(response)
  }

  return Option.none()
}
