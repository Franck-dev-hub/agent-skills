import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'franck-dev-skills',
  component: 'Pane',
  requestId: 'pull-requests',
  props: {
    title: 'PR',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const run = (command: string) =>
  ({ command, args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } }) as const
const OK = { isStdoutTruncated: false, isStderrTruncated: false }
const NOW = Date.parse('2026-01-03T00:00:00Z')

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

const PRS = [
  {
    number: 7,
    title: 'Add the cart',
    url: 'https://github.com/acme/shop/pull/7',
    isDraft: false,
    mergeable: 'MERGEABLE',
    reviewDecision: 'REVIEW_REQUIRED',
    statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'SUCCESS' }],
    updatedAt: '2026-01-01T00:00:00Z',
    author: { login: 'alice' },
  },
  {
    number: 8,
    title: 'Fix the login',
    url: 'https://github.com/acme/shop/pull/8',
    isDraft: false,
    mergeable: 'MERGEABLE',
    reviewDecision: '',
    statusCheckRollup: [{ status: 'IN_PROGRESS' }],
    updatedAt: '2026-01-01T00:00:00Z',
    author: { login: 'bob' },
  },
  {
    number: 9,
    title: 'Conflicting',
    url: 'https://github.com/acme/shop/pull/9',
    isDraft: false,
    mergeable: 'CONFLICTING',
    reviewDecision: 'APPROVED',
    statusCheckRollup: [{ state: 'FAILURE' }],
    updatedAt: '2026-01-01T00:00:00Z',
    author: { login: 'bob' },
  },
]

function setup(on: Parameters<Parameters<typeof test>[1]>[1], remote: string, list: unknown) {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.store(on)
  mock.clock(on, { now: NOW })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', (_, e) => ({
    value:
      e.argv[0] === 'git'
        ? { ...OK, exitCode: 0, stdout: `${remote}\n`, stderr: '' }
        : { ...OK, exitCode: 0, stdout: JSON.stringify(list), stderr: '' },
  }))
}

test('on GitLab the pane lists the MRs and filters them by author', async ($, on) => {
  setup(on, 'git@gitlab.com:acme/shop.git', MRS)

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.command.run(run('mrs'))

  const ui = await $.ui.mount({ ...PANE, props: { ...PANE.props, title: 'MR' }, surface: 'desktop' })
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

test('on GitHub the pane lists the PRs with a state built from gh fields', async ($, on) => {
  setup(on, 'git@github.com:acme/shop.git', PRS)

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.command.run(run('prs'))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Link', text: /#7 Add the cart/ })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /^alice/ }))?.text).toBe('alice · à approuver · 2 j')
  const bob = await ui.find({ type: 'Text', text: /^bob · CI en cours/ })
  expect(bob?.text).toBe('bob · CI en cours · 2 j')
  expect((await ui.find({ type: 'Text', text: /^bob · conflit/ }))?.text).toBe('bob · conflit · 2 j')
  expect((await ui.find({ type: 'Text', text: /PR · maj/ }))?.text).toBe('3/3 PR · maj il y a 0 min')
  await ui.unmount()
})

test('a gh failure shows its error', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.store(on)
  mock.clock(on, { now: NOW })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', (_, e) => ({
    value:
      e.argv[0] === 'git'
        ? { ...OK, exitCode: 0, stdout: 'git@github.com:acme/shop.git\n', stderr: '' }
        : { ...OK, exitCode: 4, stdout: '', stderr: 'gh: To get started with GitHub CLI, please run: gh auth login' },
  }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.command.run(run('prs'))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /gh auth login/ })).toBeDefined()
  await ui.unmount()
})
