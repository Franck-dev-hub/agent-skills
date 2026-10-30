import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'franck-dev-skills',
  component: 'Pane',
  requestId: 'tokens',
  props: {
    title: 'Tokens',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const OK = { isStdoutTruncated: false, isStderrTruncated: false, exitCode: 0, stderr: '' }

const step = (seconds: number, cacheRead: number, model: string) => ({
  model_s: seconds,
  session_s: seconds,
  input: 10,
  output: 1_000,
  cache_creation: 9_000,
  cache_read: cacheRead,
  total: 10_010 + cacheRead,
  calls: 3,
  peak: 1,
  models: { [model]: { calls: 3, input: 10, output: 1_000, cache_write_5m: 9_000, cache_write_1h: 0, cache_read: cacheRead } },
})

const STATES: Record<string, unknown> = {
  '/repo/plans/42-cart/metrics/state.json': { steps: { '5': step(3_600, 2_000_000, 'claude-opus-5-5') } },
  '/repo/plans/PROJ-7-login/metrics/state.json': {
    steps: { '4': step(600, 89_990, 'claude-opus-5-5'), '6': step(120, 0, 'claude-sonnet-5-5') },
  },
}

test('the pane lists the tickets by tokens spent and opens one on a click', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  mock.store(on)
  mock.clock(on, { now: 0 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', (_, e) => ({
    value: { ...OK, stdout: 'git' === e.argv[0] ? '/repo\n' : 'find' === e.argv[0] ? `${Object.keys(STATES).join('\n')}\n` : '' },
  }))
  on('fs.read', (_, e) => ({ value: JSON.stringify(STATES[String(e.path)]) }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const cart = await ui.find({ type: 'Button', key: 'ticket-42' })
    const login = await ui.find({ type: 'Button', key: 'ticket-PROJ-7' })
    expect(cart?.text).toBe('▸ 42 cart 2.0 M 1 h 00')
    expect(login?.text).toBe('▸ PROJ-7 login 110 k 12 min')
    expect(await ui.find({ type: 'Text', text: /^4 Grill/ })).toBeUndefined()

    await ui.press({ key: 'ticket-PROJ-7' })
    expect((await ui.find({ type: 'Text', text: /^4 Grill/ }))?.text).toBe('4 Grill : 100 k 10 min')
    expect((await ui.find({ type: 'Text', text: /^claude-sonnet/ }))?.text).toBe('claude-sonnet-5-5 : 10 k')
    await ui.press({ key: 'ticket-PROJ-7' })
    await ui.unmount()
  }
})
