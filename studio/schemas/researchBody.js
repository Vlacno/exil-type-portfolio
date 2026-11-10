import { defineArrayMember, defineField, defineType } from 'sanity'

export default defineType({
  name: 'researchBody',
  title: 'Текст статьи',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Абзац', value: 'normal' },
        { title: 'Подзаголовок', value: 'h2' },
        { title: 'Малый подзаголовок', value: 'h3' },
        { title: 'Цитата', value: 'blockquote' },
      ],
      lists: [{ title: 'Маркированный список', value: 'bullet' }, { title: 'Нумерованный список', value: 'number' }],
      marks: {
        decorators: [{ title: 'Жирный', value: 'strong' }, { title: 'Курсив', value: 'em' }],
        annotations: [defineArrayMember({
          name: 'link', title: 'Ссылка', type: 'object',
          fields: [defineField({ name: 'href', title: 'Адрес', type: 'url', validation: (rule) => rule.required().uri({ scheme: ['http', 'https', 'mailto'] }) })],
        })],
      },
    }),
    defineArrayMember({ type: 'researchImage' }),
  ],
})
