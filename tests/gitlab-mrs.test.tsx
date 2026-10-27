import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'franck-dev-skills',
  component: 'Pane',
  requestId: 'gitlab-mrs',
  props: {
    title: 'MR',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const RUN = { command: 'mrs', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } } as const
const OK = { isStdoutTruncated: false, isStderrTruncated: false }

const MRS = [
  {
    iid: 12,
    title: 'Add the cart',
    web_url: 'https://gitlab.com/acme/shop/-/merge_requests/12',
    draft: false,
    detailed_merge_status: 'mergeable',
    updated_at: '2026-01-01T00:00:00Z',
    author: { username: 'alice' },
  },
  {
    iid: 13,
    title: 'Fix the login',
    web_url: 'https://gitlab.com/acme/shop/-/merge_requests/13',
    draft: true,
    detailed_merge_status: 'draft_status',
    updated_at: '2026-01-01T00:00:00Z',
    author: { username: 'bob' },
  },
]

test('the pane lists the MRs and filters them by author', async ($, on) => {
  on('command.register', () => ({ value: { command: 'mrs' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-01-03T00:00:00Z') })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', (_, e) => ({
    value:
      e.argv[0] === 'git'
        ? { ...OK, exitCode: 0, stdout: 'git@gitlab.com:acme/shop.git\n', stderr: '' }
        : { ...OK, exitCode: 0, stdout: JSON.stringify(MRS), stderr: '' },
  }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Link', text: /!12 Add the cart/ })).toBeDefined()
  expect(await ui.find({ type: 'Link', text: /!13 Fix the login/ })).toBeDefined()

  await ui.select({ key: 'author', value: 'bob' })
  expect(await ui.find({ type: 'Link', text: /!12/ })).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /^bob/ }))?.text).toMatch(/^bob · draft · \d+ j$/)
  await ui.unmount()

  const terminal = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await terminal.find({ type: 'Link', text: /!13/ })).toBeDefined()
  await terminal.unmount()
})

test('a glab failure shows its error', async ($, on) => {
  on('command.register', () => ({ value: { command: 'mrs' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-01-03T00:00:00Z') })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', () => ({ value: { ...OK, exitCode: 1, stdout: '', stderr: 'none of the git remotes point to a GitLab host' } }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /GitLab host/ })).toBeDefined()
  await ui.unmount()
})
