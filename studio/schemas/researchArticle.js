import { defineArrayMember, defineField, defineType } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'

const headingFonts = [
  { title: 'Source Serif 4', value: 'source-serif-4' },
  { title: 'Unbounded', value: 'unbounded' },
  { title: 'Roboto Condensed', value: 'roboto-condensed' },
  { title: 'Russo One', value: 'russo-one' },
  { title: 'Inter', value: 'inter' },
  { title: 'Ruslan Display', value: 'ruslan-display' },
]

export default defineType({
  name: 'researchArticle',
  title: 'Research — статьи',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    { name: 'main', title: 'Карточка', default: true },
    { name: 'content', title: 'Текст статьи' },
    { name: 'credits', title: 'Автор и источники' },
  ],
  fields: [
    defineField({ name: 'title', title: 'Название', type: 'string', group: 'main', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug', title: 'Адрес страницы', type: 'slug', group: 'main',
      description: 'Не меняйте после публикации без настройки перенаправления. Для существующих статей сохраните текущий адрес.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required().custom((value) => !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || 'Используйте латинские строчные буквы, цифры и дефисы.'),
    }),
    defineField({ name: 'summary', title: 'Краткое описание', type: 'text', rows: 3, group: 'main', validation: (rule) => rule.required() }),
    defineField({ name: 'font', title: 'Шрифт заголовка', type: 'string', group: 'main', initialValue: 'source-serif-4', options: { list: headingFonts }, validation: (rule) => rule.required().valid(headingFonts.map(({ value }) => value)) }),
    defineField({ name: 'order', title: 'Порядок в каталоге', type: 'number', group: 'main', initialValue: 0, description: 'Меньшее число — выше в списке.', validation: (rule) => rule.integer().min(0) }),
    defineField({ name: 'body', title: 'Текст статьи', type: 'researchBody', group: 'content', validation: (rule) => rule.required().min(1) }),
    defineField({ name: 'credits', title: 'Автор / перевод', type: 'text', rows: 2, group: 'credits' }),
    defineField({ name: 'copyright', title: 'Авторские права', type: 'text', rows: 3, group: 'credits' }),
    defineField({ name: 'sources', title: 'Источники', type: 'array', group: 'credits', of: [defineArrayMember({
      name: 'researchSource', title: 'Источник', type: 'object', icon: DocumentTextIcon,
      fields: [
        defineField({ name: 'citation', title: 'Библиографическое описание', type: 'text', rows: 3, validation: (rule) => rule.required() }),
        defineField({ name: 'url', title: 'Ссылка', type: 'url', validation: (rule) => rule.uri({ scheme: ['http', 'https'] }) }),
      ],
      preview: { select: { title: 'citation', subtitle: 'url' } },
    })] }),
  ],
  orderings: [{ title: 'Порядок в каталоге', name: 'catalogueOrder', by: [{ field: 'order', direction: 'asc' }, { field: 'title', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
})
