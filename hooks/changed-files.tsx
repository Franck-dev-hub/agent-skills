import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ChangedFile, ChangedFiles, FilesMode } from '../types'

const PANE = 'changed-files'
const TITLE = 'Fichiers'
const MAX_FILES = 300

const mode = atom({ plugin: 'franck-dev-skills', key: 'filesMode' } as const, 'branch' as FilesMode)
const changedFiles = atom({ plugin: 'franck-dev-skills', key: 'changedFiles' } as const, null as ChangedFiles)

// setsid: a PhpStorm started by the call must outlive it; the Toolbox script is not always on PATH.
const OPEN_IN_PHPSTORM =
  'p=$(command -v phpstorm || echo "$HOME/.local/share/JetBrains/Toolbox/scripts/phpstorm"); ' +
  'setsid -f "$p" "$@" >/dev/null 2>&1'

async function git($: EngineInterface, cwd: string, args: string[]): Promise<string> {
  const run = await $.process.run(['git', ...args], { cwd, timeoutMs: 20_000 })
  if (0 !== run.exitCode) {
    throw new Error(run.stderr.trim() || `git ${args[0]} exited ${run.exitCode}`)
  }

  return run.stdout
}

function parseFiles(numstat: string, diff: string, untracked: string): ChangedFile[] {
  const lines = new Map<string, number>()
  const deleted = new Set<string>()
  let from = ''
  let current: string | null = null

  for (const line of diff.split('\n')) {
    if (line.startsWith('--- ')) {
      from = line.slice(4).replace(/^a\//, '')
    } else if (line.startsWith('+++ ')) {
      current = '+++ /dev/null' === line ? null : line.slice(6)
      if (null === current) {
        deleted.add(from)
      }
    } else if (line.startsWith('@@') && null !== current && !lines.has(current)) {
      lines.set(current, Math.max(1, Number(/\+(\d+)/.exec(line)?.[1] ?? 1)))
    }
  }

  const changed = numstat
    .split('\n')
    .filter(Boolean)
    .map((row): ChangedFile => {
      const [added = '0', removed = '0', path = ''] = row.split('\t')

      return {
        path,
        line: lines.get(path) ?? 1,
        added: Number(added) || 0,
        deleted: Number(removed) || 0,
        kind: deleted.has(path) ? 'deleted' : 'modified',
      }
    })
  const fresh = untracked
    .split('\n')
    .filter(Boolean)
    .map((path): ChangedFile => ({ path, line: 1, added: 0, deleted: 0, kind: 'new' }))

  return [...changed, ...fresh].sort((a, b) => a.path.localeCompare(b.path))
}

async function refresh($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  const current = await read($, mode)
  let next: ChangedFiles

  try {
    const root = (await git($, cwd, ['rev-parse', '--show-toplevel'])).trim()
    let base = 'HEAD'
    let from = 'HEAD'
    if ('branch' === current) {
      base = (
        await git($, root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).catch(() => 'origin/main')
      ).trim()
      from = (await git($, root, ['merge-base', 'HEAD', base])).trim()
    }
    const [numstat, diff, untracked] = await Promise.all([
      git($, root, ['diff', '--numstat', '--no-renames', from]),
      git($, root, ['diff', '-U0', '--no-color', '--no-ext-diff', '--no-renames', from]),
      git($, root, ['ls-files', '--others', '--exclude-standard']),
    ])
    next = { root, base, files: parseFiles(numstat, diff, untracked), error: null }
  } catch (error) {
    next = { root: cwd, base: '', files: [], error: error instanceof Error ? error.message : String(error) }
  }

  await update($, changedFiles, () => next)
}

async function openFile($: EngineInterface, root: string, file: ChangedFile): Promise<void> {
  const run = await $.process.run([
    'sh',
    '-c',
    OPEN_IN_PHPSTORM,
    'sh',
    '--line',
    String(file.line),
    `${root}/${file.path}`,
  ])
  if (0 !== run.exitCode) {
    $.ui.toast(`PhpStorm n'a pas pu ouvrir ${file.path}`)
  }
}

export async function startChangedFiles($: EngineInterface): Promise<void> {
  await $.command.register({ name: 'fichiers', description: 'Show the changed files, each opening in PhpStorm' })
}

// Only once the pane was opened: four git calls per turn are wasted otherwise.
export async function refreshChangedFiles($: EngineInterface): Promise<void> {
  if (null !== (await read($, changedFiles))) {
    await refresh($)
  }
}

export const register: Register = on => {
  on('command.run', { command: 'fichiers' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    await refresh($)

    return { text: 'Changed files pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const data = await read($, changedFiles)
    const current = await read($, mode)

    if (null === data) {
      return <Text dimColor>Lecture du diff…</Text>
    }

    const switchTo = async (value: string) => {
      await update($, mode, () => ('uncommitted' === value ? 'uncommitted' : 'branch'))
      await refresh($)
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1}>
          {'Select' in ui && (
            <ui.Select
              key="mode"
              label="Comparer"
              value={current}
              options={[
                { value: 'branch', label: 'Branche vs base' },
                { value: 'uncommitted', label: 'Non commité' },
              ]}
              onSelect={switchTo}
            />
          )}
          <Button key="refresh" label="Rafraîchir" onPress={() => refresh($)} />
        </Box>
        {null !== data.error && <Text color="red">{data.error}</Text>}
        {null === data.error && <Text dimColor>{`${data.files.length} fichier(s) · vs ${data.base}`}</Text>}
        <Box flexDirection="column">
          {data.files.slice(0, MAX_FILES).map(file =>
            'deleted' === file.kind ? (
              <Text dimColor>{`${file.path} (supprimé)`}</Text>
            ) : (
              <Button key={file.path} plain onPress={() => openFile($, data.root, file)}>
                {file.path}
                <Text dimColor>{'new' === file.kind ? ' nouveau' : ` +${file.added} -${file.deleted}`}</Text>
              </Button>
            ),
          )}
        </Box>
        {data.files.length > MAX_FILES && <Text dimColor>{`… et ${data.files.length - MAX_FILES} autres`}</Text>}
      </Box>
    )
  })
}
