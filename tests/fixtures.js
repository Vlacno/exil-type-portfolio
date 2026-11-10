import { test as base, expect } from '@playwright/test'

// Runs before every browser test. Test-specific fixtures can fulfill requests,
// but unmatched external requests never reach a customer's service or a CDN.
export const test = base.extend({
  context: async ({ context, baseURL }, runFixture) => {
    const origin = new URL(baseURL).origin
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      return url.origin === origin ? route.continue() : route.abort('blockedbyclient')
    })
    await runFixture(context)
  },
})

export { expect }
