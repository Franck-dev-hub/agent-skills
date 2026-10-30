import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { TicketTokens, TokenStep, Tokens } from '../types'

export const TOKENS_PANE = { id: 'tokens', title: 'Tokens' }

const STEP_NAMES = ['Read', 'Branch', 'Context', 'Grill', 'Code', 'Recette', 'Docs', 'Commit', 'PR', 'Merge']
const PRUNED = ['node_modules', 'vendor', '.git', 'var']
const TYPES = [
  { key: 'cacheRead', label: 'cache read', color: '#E5B700' },
  { key: 'cacheCreation', label: 'cache write', color: '#5BB974' },
  { key: 'output', label: 'output', color: '#F2994A' },
  { key: 'input', label: 'input', color: '#5794F2' },
] as const

const tokens = atom({ plugin: 'franck-dev-skills', key: 'tokens' } as const, null as Tokens)
const opened = atom({ plugin: 'franck-dev-skills', key: 'tokensTicket' } as const, null as string | null)

type StateStep = {
  model_s: number
  input: number
  output: number
  cache_creation: number
  cache_read: number
  total: number
  models?: Record<string, { input: number; output: number; cache_write_5m: number; cache_write_1h: number; cache_read: number }>
}

function toTicket(path: string, text: string): TicketTokens | null {
  const folder = path.split('/').at(-3) ?? ''
  const match = /^(([A-Za-z][A-Za-z0-9_]*-?)?[0-9]+)-(.*)$/.exec(folder)
  if (null === match) {
    return null
  }

  const state = JSON.parse(text) as { steps?: Record<string, StateStep> }
  const steps: TokenStep[] = Object.entries(state.steps ?? {})
    .map(([num, step]) => ({
      num: Number(num),
      name: STEP_NAMES[Number(num) - 1] ?? num,
      seconds: step.model_s,
      input: step.input,
      output: step.output,
      cacheCreation: step.cache_creation,
      cacheRead: step.cache_read,
      total: step.total,
    }))
    .sort((a, b) => a.num - b.num)
  const models: Record<string, number> = {}
  for (const step of Object.values(state.steps ?? {})) {
    for (const [model, count] of Object.entries(step.models ?? {})) {
      const total = count.input + count.output + count.cache_write_5m + count.cache_write_1h + count.cache_read
      models[model] = (models[model] ?? 0) + total
    }
  }
  const sum = (key: 'seconds' | 'input' | 'output' | 'cacheCreation' | 'cacheRead' | 'total') =>
    steps.reduce((total, step) => total + step[key], 0)

  return {
    id: match[1] ?? folder,
    name: match[3] ?? '',
    seconds: sum('seconds'),
    input: sum('input'),
    output: sum('output'),
    cacheCreation: sum('cacheCreation'),
    cacheRead: sum('cacheRead'),
    total: sum('total'),
    steps,
    models: Object.entries(models)
      .map(([model, total]) => ({ model, total }))
      .sort((a, b) => b.total - a.total),
  }
}

export async function refreshTokens($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  let next: Tokens

  try {
    const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd, timeoutMs: 10_000 })
    if (0 !== top.exitCode) {
      await update($, tokens, () => null)

      return
    }

    const prune = PRUNED.flatMap((name, i) => (0 === i ? ['-name', name] : ['-o', '-name', name]))
    const found = await $.process.run(
      ['find', '-L', top.stdout.trim(), '-maxdepth', '12', '-type', 'd', '(', ...prune, ')', '-prune', '-o',
        '-type', 'f', '-path', '*/metrics/state.json', '-print'],
      { cwd, timeoutMs: 20_000 },
    )
    const paths = found.stdout.split('\n').filter(Boolean)
    const tickets = (await Promise.all(paths.map(async path => toTicket(path, await $.fs.read(path)))))
      .filter((ticket): ticket is TicketTokens => null !== ticket && ticket.total > 0)
      .sort((a, b) => b.total - a.total)
    next = { tickets, error: null }
  } catch (error) {
    next = { tickets: [], error: String(error) }
  }

  await update($, tokens, () => next)
}

export async function hasTokens($: EngineInterface): Promise<boolean> {
  const found = await read($, tokens)

  return null !== found && found.tickets.length > 0
}

export async function startTokens($: EngineInterface): Promise<void> {
  await $.command.register({ name: 'tokens', description: 'Show the tokens spent per ticket in a pane' })
  await refreshTokens($)
}

function amount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)} M`
  }

  return n >= 1_000 ? `${Math.round(n / 1_000)} k` : `${n}`
}

function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60)

  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`
}

export const register: Register = on => {
  on('command.run', { command: 'tokens' }, async $ => {
    await $.ui.open(TOKENS_PANE)
    await refreshTokens($)

    return { text: 'Tokens pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: TOKENS_PANE.id }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const [data, current] = await Promise.all([read($, tokens), read($, opened)])

    if (null === data) {
      return <Text dimColor>Lecture des métriques…</Text>
    }

    const max = Math.max(1, ...data.tickets.map(ticket => ticket.total))

    return (
      <Box flexDirection="column" gap={1}>
        {null !== data.error && <Text color="red">{data.error}</Text>}
        {0 === data.tickets.length && null === data.error && <Text dimColor>Aucun ticket mesuré dans ce dépôt.</Text>}
        {data.tickets.map(ticket => (
          <Box key={ticket.id} flexDirection="column">
            <Button
              key={`ticket-${ticket.id}`}
              plain
              onPress={() => update($, opened, open => (ticket.id === open ? null : ticket.id))}
            >
              {ticket.id === current ? '▾' : '▸'} {ticket.id} <Text dimColor>{ticket.name}</Text> {amount(ticket.total)}{' '}
              <Text dimColor>{duration(ticket.seconds)}</Text>
            </Button>
            <Box flexDirection="row" width={`${Math.round((100 * ticket.total) / max)}%`} height={1}>
              {TYPES.map(type => (
                <Box key={type.key} width={`${Math.round((100 * ticket[type.key]) / ticket.total)}%`} backgroundColor={type.color} />
              ))}
            </Box>
            {ticket.id === current && (
              <Box flexDirection="column" paddingLeft={2}>
                <Text dimColor>
                  {TYPES.map(type => `${type.label} ${amount(ticket[type.key])}`).join(' · ')}
                </Text>
                {ticket.steps.map(step => (
                  <Text key={`step-${step.num}`}>
                    {step.num} {step.name} : {amount(step.total)} <Text dimColor>{duration(step.seconds)}</Text>
                  </Text>
                ))}
                {ticket.models.map(model => (
                  <Text key={`model-${model.model}`} dimColor>
                    {model.model} : {amount(model.total)}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        ))}
        <Box flexDirection="row" gap={2}>
          {TYPES.map(type => (
            <Text key={`legend-${type.key}`} color={type.color}>
              ■ <Text dimColor>{type.label}</Text>
            </Text>
          ))}
        </Box>
        <Button key="refresh" label="Rafraîchir" onPress={() => refreshTokens($)} />
      </Box>
    )
  })
}
