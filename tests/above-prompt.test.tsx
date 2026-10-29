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

function run(argv: string[], gitlab: boolean, wt: boolean) {
  if ('git' === argv[0]) {
    return { ...OK, exitCode: 0, stdout: gitlab ? 'git@gitlab.com:acme/shop.git\n' : 'git@github.com:acme/shop.git\n', stderr: '' }
  }
  if ('glab' === argv[0]) {
    return { ...OK, exitCode: 0, stdout: '[]', stderr: '' }
  }

  return wt
    ? { ...OK, exitCode: 0, stdout: JSON.stringify({ items: [TREE] }), stderr: '' }
    : { ...OK, exitCode: 127, stdout: '', stderr: 'wt: command not found' }
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
  on('process.run', (_, e) => ({ value: run(e.argv, true, true) }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual([])

  const ui = await $.ui.mount({ ...ABOVE, surface: 'desktop' })
  expect(await ui.find({ type: 'Button', text: /MR/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', text: /Worktrees/ })).toBeDefined()
  await ui.press({ key: 'gitlab-mrs' })
  await ui.press({ key: 'worktrees' })
  expect(opened).toEqual(['gitlab-mrs', 'worktrees'])
  await ui.unmount()
})

test('a GitHub repository gets the Worktrees button alone', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.store(on)
  mock.clock(on, { now: 0 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', (_, e) => ({ value: run(e.argv, false, true) }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...ABOVE, surface: 'desktop' })
  expect(await ui.find({ type: 'Button', text: /MR/ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', text: /Worktrees/ })).toBeDefined()
  await ui.unmount()
})
