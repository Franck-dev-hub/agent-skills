export type Step = { num: number; name: string; detail: string; isCurrent: boolean }
export type Roadmap = { steps: Step[]; note: string } | null

export type Worktree = {
  branch: string
  path: string
  isMain: boolean
  isCurrent: boolean
  marker: string
  changes: string[]
  added: number
  deleted: number
  ahead: number | null
  behind: number | null
  subject: string
}
export type Worktrees = { worktrees: Worktree[]; error: string | null } | null

export type FilesMode = 'branch' | 'uncommitted'
export type ChangedFile = {
  path: string
  line: number
  added: number
  deleted: number
  kind: 'modified' | 'new' | 'deleted'
}
export type ChangedFiles = { root: string; base: string; files: ChangedFile[]; error: string | null } | null

export type TokenStep = {
  num: number
  name: string
  seconds: number
  input: number
  output: number
  cacheCreation: number
  cacheRead: number
  total: number
}
export type TicketTokens = {
  id: string
  name: string
  seconds: number
  input: number
  output: number
  cacheCreation: number
  cacheRead: number
  total: number
  steps: TokenStep[]
  models: { model: string; total: number }[]
}
export type Tokens = { tickets: TicketTokens[]; error: string | null } | null

declare module 'claude-code' {
  interface PluginState {
    'franck-dev-skills': {
      roadmap: Roadmap
      worktrees: Worktrees
      filesMode: FilesMode
      changedFiles: ChangedFiles
      tokens: Tokens
      tokensTicket: string | null
    }
  }
}
