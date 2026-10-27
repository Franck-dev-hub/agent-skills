import type { Register } from 'claude-code'

import { register as gitlabMrs, startMergeRequests } from './gitlab-mrs'
import { refreshRoadmap, register as ticketRoadmap } from './ticket-roadmap'
import { refreshWorktrees, register as worktrees, startWorktrees } from './worktrees'

// A plugin has one hooks module and one unmatched hook per event: the features share these two.
export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await Promise.allSettled([
      refreshRoadmap($),
      startMergeRequests($),
      startWorktrees($),
    ])

    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await refreshRoadmap($)
    void refreshWorktrees($)

    return done
  })

  ticketRoadmap(on, options)
  gitlabMrs(on, options)
  worktrees(on, options)
}
