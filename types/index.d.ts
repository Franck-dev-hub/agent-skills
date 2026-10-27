export type Step = { num: number; name: string; detail: string; isCurrent: boolean }
export type Roadmap = { steps: Step[]; note: string } | null

declare module 'claude-code' {
  interface PluginState {
    'franck-dev-skills': { roadmap: Roadmap }
  }
}
