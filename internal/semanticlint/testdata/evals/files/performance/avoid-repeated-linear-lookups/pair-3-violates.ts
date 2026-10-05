type Member = { readonly id: string; readonly role: string }

export const selectReviewers = (
  members: ReadonlyArray<Member>,
  permittedRoles: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const reviewerIds: Array<string> = []
  for (const member of members) {
    if (permittedRoles.includes(member.role)) {
      reviewerIds.push(member.id)
    }
  }
  return reviewerIds
}
