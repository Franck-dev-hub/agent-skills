import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'franck-dev-skills',
  component: 'Pane',
  requestId: 'worktrees',
  props: {
    title: 'Worktrees',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const CLEAN = { staged: false, modified: false, untracked: false, renamed: false, deleted: false, conflicted: false }

const ITEMS = [
  {
    branch: 'develop',
    head: { short_sha: 'aaaa1111', subject: '[Fix] Something' },
    worktree: { path: '/repo', main: true, current: false, changes: { ...CLEAN, diff: { added: 0, deleted: 0 } } },
    upstream: { ahead: 0, behind: 2 },
  },
  {
    branch: 'feature/42-cart',
    head: { short_sha: 'bbbb2222', subject: '[Feature] #42 Add the cart' },
    worktree: {
      path: '/repo.feature-42-cart',
      main: false,
      current: true,
      changes: { ...CLEAN, modified: true, untracked: true, diff: { added: 10, deleted: 3 } },
    },
    marker: '💬',
  },
  { branch: 'old', head: { short_sha: 'cccc3333', subject: 'no worktree' } },
]

const OK = { isStdoutTruncated: false, isStderrTruncated: false }

test('the pane indexes each worktree with its state', async ($, on) => {
  on('command.register', () => ({ value: { command: 'worktrees' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.clock(on, { now: 0 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', () => ({ value: { ...OK, exitCode: 0, stdout: JSON.stringify({ items: ITEMS }), stderr: '' } }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /develop/ }))?.text).toBe('○ develop (principal)')
    expect((await ui.find({ type: 'Text', text: /^propre/ }))?.text).toBe('propre · ↑0 ↓2')
    expect((await ui.find({ type: 'Text', text: /feature\/42/ }))?.text).toBe('● feature/42-cart 💬')
    expect((await ui.find({ type: 'Text', text: /^modifié/ }))?.text).toBe(
      "modifié, non suivi +10 -3 · pas d'upstream · /repo.feature-42-cart",
    )
    expect(await ui.find({ type: 'Text', text: /no worktree/ })).toBeUndefined()
    await ui.unmount()
  }
})
