import type { Register } from 'claude-code'

import { register as abovePrompt } from './above-prompt'
import { refreshChangedFiles, register as changedFiles, startChangedFiles } from './changed-files'
import { register as pullRequests, startPullRequests } from './pull-requests'
import { refreshRoadmap, register as ticketRoadmap } from './ticket-roadmap'
import { refreshTokens, register as tokens, startTokens } from './tokens'
import { refreshWorktrees, register as worktrees, startWorktrees } from './worktrees'

// A plugin has one hooks module and one unmatched hook per event: the features share these two.
export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await Promise.allSettled([
      refreshRoadmap($),
      startPullRequests($),
      startWorktrees($),
      startChangedFiles($),
      startTokens($),
    ])

    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await refreshRoadmap($)
    void refreshWorktrees($)
    void refreshChangedFiles($)
    void refreshTokens($)

    return done
  })

  abovePrompt(on, options)
  ticketRoadmap(on, options)
  pullRequests(on, options)
  worktrees(on, options)
  changedFiles(on, options)
  tokens(on, options)
}
