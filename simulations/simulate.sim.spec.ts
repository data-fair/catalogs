/**
 * One judged scenario per case, run by lib-agents-sim's runSimulation: the test fails
 * only when the run itself is invalid. Whether the product served the person is the
 * judge's call, from the transcript.
 */
import { test } from '@playwright/test'
import { runSimulation, selectCases, simCaseNames } from '@data-fair/lib-agents-sim'
import { cases } from './cases/index.ts'
import { seedAll } from './runner/fixtures.ts'
import { ROOT, seedSettings } from './runner/settings.ts'
import { login, resolveRoute } from './runner/backoffice.ts'

for (const simCase of selectCases(cases, simCaseNames())) {
  test(`simulation: ${simCase.name}`, async ({ page }) => {
    await runSimulation(page, simCase, {
      agentsUrl: `${ROOT}/agents`,
      locale: 'fr',
      setup: async ({ assistantModel, toolsModel }) => {
        const ids = await seedAll()
        await seedSettings(assistantModel, toolsModel)
        // Same cookie as the e2e fixtures: the back-office language choice.
        await page.context().addCookies([{ name: 'i18n_lang', value: 'fr', url: ROOT }])
        await login(page, ROOT + resolveRoute(simCase.route, ids))
      },
      // One root that sees through its iframes: the shell, the catalogs UI inside its
      // d-frame, and the chat. The catalogs forms are long, hence the cap.
      perceptionRoots: [{ label: 'page', root: page, frames: true, cap: 16000 }]
    })
  })
}
