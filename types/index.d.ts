export type Step = { num: number; name: string; detail: string; isCurrent: boolean }
export type Roadmap = { steps: Step[]; note: string } | null

export type MergeRequest = {
  iid: number
  title: string
  url: string
  author: string
  isDraft: boolean
  status: string
  updatedAt: string
}
export type MergeRequests = { mrs: MergeRequest[]; error: string | null; fetchedAt: number } | null

declare module 'claude-code' {
  interface PluginState {
    'franck-dev-skills': {
      roadmap: Roadmap
      mergeRequests: MergeRequests
      mergeRequestAuthor: string
    }
  }
}
