declare const isAdmin: boolean
declare const isModerator: boolean
declare const redirect: (path: string) => Response

export const routeUser = (): Response | undefined => {
  if (isAdmin) {
    return redirect("/dashboard")
  }
  if (isModerator) {
    return redirect("/dashboard")
  }
}
