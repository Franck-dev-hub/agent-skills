import type { Register } from 'claude-code'

import { register as gitlabMrs, startMergeRequests } from './gitlab-mrs'
import { refreshRoadmap, register as ticketRoadmap } from './ticket-roadmap'

// A plugin has one hooks module and one unmatched hook per event: the features share these two.
export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await Promise.allSettled([
      refreshRoadmap($),
      startMergeRequests($),
    ])

    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await refreshRoadmap($)

    return done
  })

  ticketRoadmap(on, options)
  gitlabMrs(on, options)
}
