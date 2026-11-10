import { sanityProject } from '../shared/sanityConfig.js'
import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: { ...sanityProject },
})
