export function makePullRequestReviewId(prId: string, headSha: string): string {
  return `${prId}-${headSha}-summary`;
}
