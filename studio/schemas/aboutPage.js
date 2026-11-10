import { defineArrayMember, defineField, defineType } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { aboutSections } from '../../src/data/aboutSections'

export default defineType({
  name: 'aboutPage',
  title: 'About — о проекте',
  type: 'document',
  icon: DocumentTextIcon,
  preview: { prepare: () => ({ title: 'About — о проекте' }) },
  initialValue: () => ({
    sections: aboutSections.map(({ id, title, paragraphs, email }) => ({
      _type: 'aboutSection', _key: id, title, ...(email ? { email } : {}),
      body: paragraphs.map((text, index) => ({
        _type: 'block', _key: `${id}-${index}`, style: 'normal', markDefs: [],
        children: [{ _type: 'span', _key: 'text', text, marks: [] }],
      })),
    })),
  }),
  fields: [defineField({
    name: 'sections', title: 'Разделы страницы', type: 'array',
    description: 'Добавляйте и перетаскивайте разделы. Первый раздел открыт при входе на страницу, остальные закрыты.',
    of: [defineArrayMember({
      name: 'aboutSection', title: 'Раздел', type: 'object', icon: DocumentTextIcon,
      preview: { select: { title: 'title' } },
      fields: [
        defineField({ name: 'title', title: 'Название раздела', type: 'string', validation: (rule) => rule.required() }),
        defineField({ name: 'body', title: 'Текст и изображения', type: 'researchBody', validation: (rule) => rule.required().min(1) }),
        defineField({ name: 'email', title: 'Контактный email', type: 'string', description: 'Необязательно. Появится ссылкой после текста этого раздела.', validation: (rule) => rule.email() }),
      ],
    })],
    validation: (rule) => rule.required().min(1),
  })],
})
