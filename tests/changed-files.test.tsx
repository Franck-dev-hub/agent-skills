import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'franck-dev-skills',
  component: 'Pane',
  requestId: 'changed-files',
  props: {
    title: 'Fichiers',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const RUN = {
  command: 'fichiers',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const DIFF = [
  'diff --git a/src/Cart.php b/src/Cart.php',
  '--- a/src/Cart.php',
  '+++ b/src/Cart.php',
  '@@ -40,0 +41,3 @@ class Cart',
  '@@ -90 +93 @@',
  'diff --git a/old.txt b/old.txt',
  '--- a/old.txt',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
].join('\n')

const GIT: Record<string, string> = {
  'rev-parse': '/repo\n',
  'symbolic-ref': 'origin/develop\n',
  'merge-base': 'abc123\n',
  numstat: '3\t0\tsrc/Cart.php\n0\t2\told.txt\n',
  diff: DIFF,
  'ls-files': 'notes.md\n',
}

test('the pane lists the changes and opens a file in PhpStorm at its first change', async ($, on) => {
  const opened: string[][] = []
  on('command.register', () => ({ value: { command: 'fichiers' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('process.run', (_, e) => {
    const [tool, verb, flag] = e.argv
    if (tool === 'sh') {
      opened.push([...e.argv.slice(4)])
    }
    const key = verb === 'diff' ? (flag === '--numstat' ? 'numstat' : 'diff') : (verb ?? '')

    return { value: { exitCode: 0, stdout: GIT[key] ?? '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start({ cwd: '/repo/src', surface: 'desktop', isInteractive: true })
  await $.command.run(RUN)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /fichier/ }))?.text).toBe('3 fichier(s) · vs origin/develop')
    expect(await ui.find({ type: 'Button', key: 'notes.md' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'old.txt' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /old\.txt \(supprimé\)/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'src/Cart.php' })
  expect(opened).toEqual([['--line', '41', '/repo/src/Cart.php']])
  await ui.unmount()
})
