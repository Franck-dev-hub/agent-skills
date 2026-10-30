import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Roadmap, Step } from '../types'

const roadmap = atom({ plugin: 'franck-dev-skills', key: 'roadmap' } as const, null as Roadmap)

const ESC = String.fromCharCode(27)
const CURRENT_START = `${ESC}[1;32m`
const CURRENT_END = `${ESC}[0m`
const ACCENT = '#667EEA'

function parse(message: string): Roadmap {
  const steps: Step[] = []
  let note = ''

  for (const part of message.split(/ {2}(?=\d+ |\u001b)/)) {
    const isCurrent = part.startsWith(CURRENT_START)
    const text = part.replace(CURRENT_START, '').replace(CURRENT_END, '').trim()
    const match = /^(\d+) ([A-Za-z]+)(?:: (.*))?$/.exec(text)

    if (null === match) {
      note = text
      continue
    }

    steps.push({ num: Number(match[1]), name: match[2] ?? '', detail: match[3] ?? '', isCurrent })
  }

  return 0 === steps.length ? (note ? { steps, note } : null) : { steps, note }
}

// ticket-status.sh stays the single source of the roadmap; this only redraws its Stop message.
export async function refreshRoadmap($: EngineInterface): Promise<void> {
  const cwd = await $.session.cwd()
  const { stdout } = await $.process.run([`${$.plugin.root}/scripts/ticket-status.sh`], {
    stdin: JSON.stringify({ cwd }),
  })
  const message = '' === stdout.trim() ? null : JSON.parse(stdout).systemMessage
  await update($, roadmap, () => (message ? parse(message) : null))
}

// read() is scanned per file: the atom stays here, readers go through this.
export async function readRoadmap($: EngineInterface): Promise<Roadmap> {
  return read($, roadmap)
}

type Resolved = ReturnType<EngineInterface['ui']['resolve']>

export function RoadmapRow({ ui, roadmap: current }: { ui: Resolved; roadmap: NonNullable<Roadmap> }) {
  const { Box, Text } = ui

  return (
    <Box flexWrap="wrap" gap={2}>
      {current.steps.map(step =>
        step.isCurrent ? (
          <Text key={String(step.num)} color={ACCENT} weight="bold">
            {step.num} {step.name}
            {step.detail ? `: ${step.detail}` : ''}
          </Text>
        ) : (
          <Text key={String(step.num)} dimColor>
            {step.num} {step.name}
          </Text>
        ),
      )}
      {current.note ? <Text color="warning">{current.note}</Text> : null}
    </Box>
  )
}

// A question pauses the turn before turn.complete refreshes the band: the card shows its own copy.
export const register: Register = on => {
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    await refreshRoadmap($)

    return next(e)
  })

  on('ui.render', { component: 'AskUserQuestion' }, async ($, e, next) => {
    if ('desktop' !== e.surface) {
      return next(e)
    }

    const current = await readRoadmap($)
    if (null === current) {
      return next(e)
    }

    const ui = $.ui.resolve(e)
    const { Box } = ui

    return (
      <Box flexDirection="column" gap={1}>
        <RoadmapRow ui={ui} roadmap={current} />
        {await next(e)}
      </Box>
    )
  })
}
