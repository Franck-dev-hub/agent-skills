import { expect, test } from 'claude-code/testing'

const QUESTIONS = [{ question: 'Tick every box?', header: 'Recette', multiSelect: false, options: [{ label: 'Yes', description: '' }, { label: 'No', description: '' }] }]

const OK = { isStdoutTruncated: false, isStderrTruncated: false, exitCode: 0, stderr: '' }
const ROADMAP = '1 Read  2 Branch  3 Context  4 Grill  5 Code  \u001b[1;32m6 Recette: review\u001b[0m  7 Docs  8 Commit  9 PR  10 Merge'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`a question refreshes the roadmap, shown on the card on desktop only (${surface})`, async ($, on) => {
    let step = '5 Code'
    on('session.start', (_, e) => ({ cwd: e.cwd }))
    on('session.cwd', () => ({ value: '/repo' }))
    on('process.run', (_, e) => ({
      value: { ...OK, stdout: e.argv[0]?.endsWith('ticket-status.sh') ? JSON.stringify({ systemMessage: ROADMAP.replace('6 Recette: review', step) }) : '' },
    }))
    on('tool.call', () => ({ result: { questions: QUESTIONS, answers: {} } }))
    on('ui.render', () => ({ type: 'engine', ref: 0 }) as const)

    await $.session.start({ cwd: '/repo', surface, isInteractive: true })
    step = '6 Recette: review'
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
