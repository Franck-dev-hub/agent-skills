import type { Register } from 'claude-code'

import { register as abovePrompt } from './above-prompt'
import { refreshChangedFiles, register as changedFiles, startChangedFiles } from './changed-files'
import { register as pullRequests, startPullRequests } from './pull-requests'
import { refreshRoadmap } from './ticket-roadmap'
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
    ])

    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await refreshRoadmap($)
    void refreshWorktrees($)
    void refreshChangedFiles($)

    return done
  })

  abovePrompt(on, options)
  pullRequests(on, options)
  worktrees(on, options)
  changedFiles(on, options)
}
