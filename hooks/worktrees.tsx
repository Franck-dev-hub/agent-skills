import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Worktree, Worktrees } from '../types'

export const WORKTREES_PANE = { id: 'worktrees', title: 'Worktrees' }
const REFRESH_MS = 30_000

const worktrees = atom({ plugin: 'franck-dev-skills', key: 'worktrees' } as const, null as Worktrees)

const CHANGES = {
  conflicted: 'conflit',
  staged: 'indexé',
  modified: 'modifié',
  deleted: 'supprimé',
  renamed: 'renommé',
  untracked: 'non suivi',
} as const

type WtItem = {
  branch: string | null
  head: { short_sha: string; subject: string }
  worktree?: {
    path: string
    main: boolean
    current: boolean
    changes: Record<keyof typeof CHANGES, boolean> & { diff: { added: number; deleted: number } }
  }
  upstream?: { ahead: number; behind: number }
  marker?: string
}

export async function refreshWorktrees($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  let next: Worktrees

  try {
    // No --full: it reaches the forge and may ask an LLM for summaries.
    const run = await $.process.run(['wt', 'list', '--format', 'json'], { cwd, timeoutMs: 20_000 })
    next =
      0 === run.exitCode
        ? { worktrees: toWorktrees(JSON.parse(run.stdout).items as WtItem[]), error: null }
        : { worktrees: [], error: run.stderr.trim() || `wt exited ${run.exitCode}` }
  } catch (error) {
    next = { worktrees: [], error: String(error) }
  }

  await update($, worktrees, () => next)
}

function toWorktrees(items: WtItem[]): Worktree[] {
  return items.flatMap(item => {
    const tree = item.worktree
    if (undefined === tree) {
      return []
    }

    return [
      {
        branch: item.branch ?? `(détaché ${item.head.short_sha})`,
        path: tree.path,
        isMain: tree.main,
        isCurrent: tree.current,
        marker: item.marker ?? '',
        changes: (Object.keys(CHANGES) as (keyof typeof CHANGES)[])
          .filter(key => tree.changes[key])
          .map(key => CHANGES[key]),
        added: tree.changes.diff.added,
        deleted: tree.changes.diff.deleted,
        ahead: item.upstream?.ahead ?? null,
        behind: item.upstream?.behind ?? null,
        subject: item.head.subject,
      },
    ]
  })
}

function details(tree: Worktree): string {
  const state = 0 === tree.changes.length ? 'propre' : `${tree.changes.join(', ')} +${tree.added} -${tree.deleted}`
  const upstream = null === tree.ahead ? "pas d'upstream" : `↑${tree.ahead} ↓${tree.behind}`

  return [state, upstream, tree.isMain ? null : tree.path].filter(Boolean).join(' · ')
}

export async function startWorktrees($: EngineInterface): Promise<void> {
  await $.command.register({ name: 'worktrees', description: 'Show the worktrunk worktrees in a pane' })

  await refreshWorktrees($)
  $.clock.every(REFRESH_MS, () => void refreshWorktrees($))
}

export async function hasWorktrees($: EngineInterface): Promise<boolean> {
  const found = await read($, worktrees)

  return null !== found && null === found.error
}

export const register: Register = on => {
  on('command.run', { command: 'worktrees' }, async $ => {
    await $.ui.open(WORKTREES_PANE)
    await refreshWorktrees($)

    return { text: 'Worktrees pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: WORKTREES_PANE.id }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const data = await read($, worktrees)

    if (null === data) {
      return <Text dimColor>Lecture des worktrees…</Text>
    }

    return (
      <Box flexDirection="column" gap={1}>
        {null !== data.error && <Text color="red">{data.error}</Text>}
        {data.worktrees.map(tree => (
          <Box flexDirection="column">
            <Text weight={tree.isCurrent ? 'bold' : 'regular'}>
              {[tree.isCurrent ? '●' : '○', tree.branch, tree.isMain ? '(principal)' : null, tree.marker || null]
                .filter(Boolean)
                .join(' ')}
            </Text>
            <Text dimColor>{details(tree)}</Text>
            <Text dimColor>{tree.subject}</Text>
          </Box>
        ))}
        <Button key="refresh" label="Rafraîchir" onPress={() => refreshWorktrees($)} />
      </Box>
    )
  })
}
