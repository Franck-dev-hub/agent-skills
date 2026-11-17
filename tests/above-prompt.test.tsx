import { expect, mock, test } from 'claude-code/testing'

const ABOVE = {
  plugin: 'franck-dev-skills',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const OK = { isStdoutTruncated: false, isStderrTruncated: false }
const CLEAN = { staged: false, modified: false, untracked: false, renamed: false, deleted: false, conflicted: false }
const TREE = {
  branch: 'main',
  head: { short_sha: 'aaaa1111', subject: 'init' },
  worktree: { path: '/repo', main: true, current: true, changes: { ...CLEAN, diff: { added: 0, deleted: 0 } } },
}

test('a button opens each available pane from above the prompt', async ($, on) => {
  const opened: string[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', (_, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  mock.store(on)
  mock.clock(on, { now: 0 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', () => ({ value: { ...OK, exitCode: 0, stdout: JSON.stringify({ items: [TREE] }), stderr: '' } }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual([])

  const ui = await $.ui.mount({ ...ABOVE, surface: 'desktop' })
  expect(await ui.find({ type: 'Button', text: /Worktrees/ })).toBeDefined()
  await ui.press({ key: 'worktrees' })
  expect(opened).toEqual(['worktrees'])
  await ui.unmount()
})
