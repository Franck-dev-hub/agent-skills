import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { MergeRequest, MergeRequests } from '../types'

export const MR_PANE = { id: 'gitlab-mrs', title: 'MR' }
const ALL = '*'
const AUTHOR_KEY = 'gitlab-mrs.author'
const REFRESH_MS = 120_000

const mergeRequests = atom({ plugin: 'franck-dev-skills', key: 'mergeRequests' } as const, null as MergeRequests)
const author = atom({ plugin: 'franck-dev-skills', key: 'mergeRequestAuthor' } as const, ALL)

const STATUS: Record<string, string> = {
  mergeable: 'prête',
  ci_still_running: 'CI en cours',
  ci_must_pass: 'CI à corriger',
  not_approved: 'à approuver',
  requested_changes: 'changements demandés',
  conflict: 'conflit',
  discussions_not_resolved: 'discussions ouvertes',
  need_rebase: 'rebase requis',
  blocked_status: 'bloquée',
  checking: 'vérification',
  unchecked: 'vérification',
  preparing: 'vérification',
}

type GlabMergeRequest = {
  iid: number
  title: string
  web_url: string
  draft: boolean
  detailed_merge_status: string
  updated_at: string
  author: { username: string }
}

async function refresh($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  const now = await $.clock.now()
  let next: MergeRequests

  try {
    const run = await $.process.run(['glab', 'mr', 'list', '-F', 'json', '--per-page', '100'], {
      cwd,
      timeoutMs: 20_000,
    })
    next =
      0 === run.exitCode
        ? { mrs: (JSON.parse(run.stdout) as GlabMergeRequest[]).map(toMergeRequest), error: null, fetchedAt: now }
        : { mrs: [], error: run.stderr.trim() || `glab exited ${run.exitCode}`, fetchedAt: now }
  } catch (error) {
    next = { mrs: [], error: String(error), fetchedAt: now }
  }

  await update($, mergeRequests, () => next)
}

function toMergeRequest(mr: GlabMergeRequest): MergeRequest {
  return {
    iid: mr.iid,
    title: mr.title,
    url: mr.web_url,
    author: mr.author.username,
    isDraft: mr.draft,
    status: mr.detailed_merge_status,
    updatedAt: mr.updated_at,
  }
}

function age(time: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - time) / 60_000))

  if (minutes < 60) {
    return `${minutes} min`
  }

  return minutes < 1440 ? `${Math.round(minutes / 60)} h` : `${Math.round(minutes / 1440)} j`
}

export async function startMergeRequests($: EngineInterface): Promise<void> {
  const saved = await $.store.get(AUTHOR_KEY)
  if ('string' === typeof saved) {
    await update($, author, () => saved)
  }
  await $.command.register({ name: 'mrs', description: 'Show the open GitLab merge requests in a pane' })

  const remote = await $.process.run(['git', 'remote', 'get-url', 'origin'], { cwd: await $.session.cwd() })
  if (0 === remote.exitCode && remote.stdout.includes('gitlab')) {
    void refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))
  }
}

// The list is fetched on a GitLab remote only: its presence tells the forge.
export async function isGitLab($: EngineInterface): Promise<boolean> {
  return null !== (await read($, mergeRequests))
}

export const register: Register = on => {
  on('command.run', { command: 'mrs' }, async $ => {
    await $.ui.open(MR_PANE)
    await refresh($)

    return { text: 'MR pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: MR_PANE.id }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button, Link } = ui
    const data = await read($, mergeRequests)
    const who = await read($, author)
    const now = await $.clock.now()

    if (null === data) {
      return <Text dimColor>Chargement des MR…</Text>
    }

    const authors = [...new Set([...data.mrs.map(mr => mr.author), ...(ALL === who ? [] : [who])])].sort()
    const shown = data.mrs.filter(mr => ALL === who || who === mr.author)
    const pick = async (value: string) => {
      await update($, author, () => value)
      await $.store.set(AUTHOR_KEY, value)
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1}>
          {'Select' in ui && (
            <ui.Select
              key="author"
              label="Auteur"
              value={who}
              options={[{ value: ALL, label: 'Tous' }, ...authors.map(name => ({ value: name, label: name }))]}
              onSelect={pick}
            />
          )}
          <Button key="refresh" label="Rafraîchir" onPress={() => refresh($)} />
        </Box>
        {null !== data.error && <Text color="red">{data.error}</Text>}
        {null === data.error && 0 === shown.length && <Text dimColor>Aucune MR ouverte.</Text>}
        {shown.map(mr => (
          <Box flexDirection="column">
            <Link href={mr.url}>{`!${mr.iid} ${mr.title}`}</Link>
            <Text dimColor>
              {[
                mr.author,
                mr.isDraft ? 'draft' : null,
                'draft_status' === mr.status ? null : (STATUS[mr.status] ?? mr.status),
                age(Date.parse(mr.updatedAt), now),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Box>
        ))}
        <Text dimColor>{`${shown.length}/${data.mrs.length} MR · maj il y a ${age(data.fetchedAt, now)}`}</Text>
      </Box>
    )
  })
}
