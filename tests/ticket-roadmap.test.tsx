import { expect, test } from 'claude-code/testing'

const QUESTIONS = [{ question: 'Tick every box?', header: 'Recette', multiSelect: false, options: [{ label: 'Yes', description: '' }, { label: 'No', description: '' }] }]

const OK = { isStdoutTruncated: false, isStderrTruncated: false, exitCode: 0, stderr: '' }
const ROADMAP = '1 Start  2 Grill  3 Code  \u001b[1;32m4 Recette: review\u001b[0m  5 Docs  6 Commit  7 PR  8 Merge'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`a question refreshes the roadmap, shown on the card on desktop only (${surface})`, async ($, on) => {
    let step = '3 Code'
    on('session.start', (_, e) => ({ cwd: e.cwd }))
    on('session.cwd', () => ({ value: '/repo' }))
    on('process.run', (_, e) => ({
      value: { ...OK, stdout: e.argv[0]?.endsWith('ticket-status.sh') ? JSON.stringify({ systemMessage: ROADMAP.replace('4 Recette: review', step) }) : '' },
    }))
    on('tool.call', () => ({ result: { questions: QUESTIONS, answers: {} } }))
    on('ui.render', () => ({ type: 'engine', ref: 0 }) as const)

    await $.session.start({ cwd: '/repo', surface, isInteractive: true })
    step = '4 Recette: review'
    await $.tool.call({ tool: 'AskUserQuestion', questions: QUESTIONS })

    const ui = await $.ui.mount({
      plugin: 'franck-dev-skills',
      surface,
      component: 'AskUserQuestion',
      props: { tool: 'AskUserQuestion', questions: QUESTIONS },
    })
    const shown = await ui.find({ type: 'Text', text: /Recette: review/ })
    if ('desktop' === surface) {
      expect(shown).toBeDefined()
    } else {
      expect(shown).toBeUndefined()
    }
    await ui.unmount()
  })
}
