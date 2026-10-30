import type { EngineInterface, Register } from 'claude-code'

import { pullRequestsPane } from './pull-requests'
import { RoadmapRow, readRoadmap } from './ticket-roadmap'
import { TOKENS_PANE, hasTokens } from './tokens'
import { WORKTREES_PANE, hasWorktrees } from './worktrees'

type Pane = { id: string; title: string }

async function panes($: EngineInterface): Promise<Pane[]> {
  const [prs, trees, spent] = await Promise.all([pullRequestsPane($), hasWorktrees($), hasTokens($)])

  return [...(null === prs ? [] : [prs]), ...(trees ? [WORKTREES_PANE] : []), ...(spent ? [TOKENS_PANE] : [])]
}

// One plugin draws one site above the prompt: the pane buttons and the roadmap share it.
export const register: Register = on => {
  // The desktop app hides Stop hook messages; the terminal already prints the roadmap.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if ('desktop' !== e.surface || e.props.hasSurvey) {
      return next(e)
    }

    const [buttons, current] = await Promise.all([panes($), readRoadmap($)])
    if (0 === buttons.length && null === current) {
      return next(e)
    }

    const ui = $.ui.resolve(e)
    const { Box, Button } = ui

    return (
      <Box flexDirection="column" gap={1}>
        {buttons.length > 0 && (
          // Other plugins drawing in this band find the row by its key to add their buttons
          <Box key="pane-buttons" flexDirection="row" gap={1}>
            {buttons.map(pane => (
              <Button key={pane.id} label={pane.title} onPress={() => $.ui.open(pane)} />
            ))}
          </Box>
        )}
        {null !== current && <RoadmapRow ui={ui} roadmap={current} />}
      </Box>
    )
  })
}
