import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Forge, PullRequest, PullRequests } from '../types'

const PANE_ID = 'pull-requests'
const ALL = '*'
const AUTHOR_KEY = 'pull-requests.author'
const REFRESH_MS = 120_000

const forge = atom({ plugin: 'franck-dev-skills', key: 'forge' } as const, null as Forge | null)
const pullRequests = atom({ plugin: 'franck-dev-skills', key: 'pullRequests' } as const, null as PullRequests)
const author = atom({ plugin: 'franck-dev-skills', key: 'pullRequestAuthor' } as const, ALL)

const FORGES: Record<Forge, { title: string; command: string; description: string; argv: string[] }> = {
  github: {
    title: 'PR',
    command: 'prs',
    description: 'Show the open GitHub pull requests in a pane',
    argv: [
      'gh',
      'pr',
      'list',
      '--limit',
      '100',
      '--json',
      'number,title,url,isDraft,mergeable,reviewDecision,statusCheckRollup,updatedAt,author',
    ],
  },
  gitlab: {
    title: 'MR',
    command: 'mrs',
    description: 'Show the open GitLab merge requests in a pane',
    argv: ['glab', 'mr', 'list', '-F', 'json', '--per-page', '100'],
  },
}

const GITLAB_STATUS: Record<string, string> = {
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

type GhCheck = { status?: string; conclusion?: string; state?: string }
type GhPullRequest = {
  number: number
  title: string
  url: string
  isDraft: boolean
  mergeable: string
  reviewDecision: string
  statusCheckRollup: GhCheck[]
  updatedAt: string
  author: { login: string }
}

function fromGitLab(mr: GlabMergeRequest): PullRequest {
  return {
    number: mr.iid,
    title: mr.title,
    url: mr.web_url,
    author: mr.author.username,
    isDraft: mr.draft,
    state: 'draft_status' === mr.detailed_merge_status ? '' : (GITLAB_STATUS[mr.detailed_merge_status] ?? mr.detailed_merge_status),
    updatedAt: mr.updated_at,
  }
}

// gh has no single merge status: conflicts, then CI, then review, as GitLab orders them.
function githubState(pr: GhPullRequest): string {
  const checks = pr.statusCheckRollup ?? []
  const failed = checks.some(c => ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED'].includes(c.conclusion ?? c.state ?? ''))
  const running = checks.some(c => 'PENDING' === c.state || (undefined !== c.status && 'COMPLETED' !== c.status))

  if ('CONFLICTING' === pr.mergeable) {
    return 'conflit'
  }
  if (failed) {
    return 'CI à corriger'
  }
  if (running) {
    return 'CI en cours'
  }
  if ('CHANGES_REQUESTED' === pr.reviewDecision) {
    return 'changements demandés'
  }
  if ('REVIEW_REQUIRED' === pr.reviewDecision) {
    return 'à approuver'
  }

  return 'prête'
}

function fromGitHub(pr: GhPullRequest): PullRequest {
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    author: pr.author.login,
    isDraft: pr.isDraft,
    state: githubState(pr),
    updatedAt: pr.updatedAt,
  }
}

async function refresh($: EngineInterface): Promise<void> {
  const which = await read($, forge)
  if (null === which) {
    return
  }

  const cwd = await $.session.cwd()
  const now = await $.clock.now()
  let next: PullRequests

  try {
    const run = await $.process.run(FORGES[which].argv, { cwd, timeoutMs: 20_000 })
    if (0 !== run.exitCode) {
      next = { prs: [], error: run.stderr.trim() || `${FORGES[which].argv[0]} exited ${run.exitCode}`, fetchedAt: now }
    } else {
      const prs =
        'github' === which
          ? (JSON.parse(run.stdout) as GhPullRequest[]).map(fromGitHub)
          : (JSON.parse(run.stdout) as GlabMergeRequest[]).map(fromGitLab)
      next = { prs, error: null, fetchedAt: now }
    }
  } catch (error) {
    next = { prs: [], error: String(error), fetchedAt: now }
  }

  await update($, pullRequests, () => next)
}

function age(time: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - time) / 60_000))

  if (minutes < 60) {
    return `${minutes} min`
  }

  return minutes < 1440 ? `${Math.round(minutes / 60)} h` : `${Math.round(minutes / 1440)} j`
}

function detectForge(remote: string): Forge | null {
  if (remote.includes('github')) {
    return 'github'
  }

  return remote.includes('gitlab') ? 'gitlab' : null
}

export async function startPullRequests($: EngineInterface): Promise<void> {
  const saved = await $.store.get(AUTHOR_KEY)
  if ('string' === typeof saved) {
    await update($, author, () => saved)
  }

  const remote = await $.process.run(['git', 'remote', 'get-url', 'origin'], { cwd: await $.session.cwd() })
  const which = 0 === remote.exitCode ? detectForge(remote.stdout) : null
  if (null === which) {
    return
  }

  await update($, forge, () => which)
  await $.command.register({ name: FORGES[which].command, description: FORGES[which].description })
  void refresh($)
  $.clock.every(REFRESH_MS, () => void refresh($))
}

// The pane to offer, named after the forge; none on a repository without a known forge.
export async function pullRequestsPane($: EngineInterface): Promise<{ id: string; title: string } | null> {
  const which = await read($, forge)

  return null === which ? null : { id: PANE_ID, title: FORGES[which].title }
}

async function open($: EngineInterface): Promise<{ text: string }> {
  const pane = await pullRequestsPane($)
  if (null === pane) {
    return { text: 'No GitHub or GitLab remote.' }
  }
  await $.ui.open(pane)
  await refresh($)

  return { text: `${pane.title} pane opened.` }
}

export const register: Register = on => {
  on('command.run', { command: 'prs' }, open)
  on('command.run', { command: 'mrs' }, open)

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button, Link } = ui
    const data = await read($, pullRequests)
    const who = await read($, author)
    const now = await $.clock.now()
    const title = (await pullRequestsPane($))?.title ?? 'PR'

    if (null === data) {
      return <Text dimColor>{`Chargement des ${title}…`}</Text>
    }

    const authors = [...new Set([...data.prs.map(pr => pr.author), ...(ALL === who ? [] : [who])])].sort()
    const shown = data.prs.filter(pr => ALL === who || who === pr.author)
    const prefix = 'MR' === title ? '!' : '#'
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
        {null === data.error && 0 === shown.length && <Text dimColor>{`Aucune ${title} ouverte.`}</Text>}
        {shown.map(pr => (
          <Box flexDirection="column">
            <Link href={pr.url}>{`${prefix}${pr.number} ${pr.title}`}</Link>
            <Text dimColor>
              {[pr.author, pr.isDraft ? 'draft' : null, pr.state || null, age(Date.parse(pr.updatedAt), now)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Box>
        ))}
        <Text dimColor>{`${shown.length}/${data.prs.length} ${title} · maj il y a ${age(data.fetchedAt, now)}`}</Text>
      </Box>
    )
  })
}
