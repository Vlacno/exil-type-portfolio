import { sanityProject } from '../shared/sanityConfig.js'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Font Portfolio Admin',

  ...sanityProject,

  plugins: [structureTool({
    structure: (S) => S.list().title('Content').items([
      ...S.documentTypeListItems().filter((item) => !['homePage', 'aboutPage'].includes(item.getId())),
      S.listItem().id('aboutPage').title('About — о проекте')
        .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
    ]),
  })],

  document: {
    actions: (actions, context) => context.schemaType === 'homePage' ? []
      : context.schemaType === 'aboutPage' ? actions.filter(({ action }) => !['delete', 'duplicate'].includes(action)) : actions,
  },

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => !['homePage', 'aboutPage'].includes(template.schemaType)),
  },
})
