import { defineArrayMember, defineField, defineType } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'

export default defineType({
  name: 'publication',
  title: 'Publications — публикации',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({ name: 'title', title: 'Название', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug', title: 'Адрес страницы', type: 'slug',
      description: 'Для существующей публикации сохраните её текущий slug из адреса сайта. Не меняйте после публикации без перенаправления.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required().custom((value) => !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || 'Используйте латинские строчные буквы, цифры и дефисы.'),
    }),
    defineField({
      name: 'cover', title: 'Обложка', type: 'image', options: { hotspot: true },
      description: 'Используется в каталоге, на главной и на странице публикации. Пропорции изображения сохраняются.',
      validation: (rule) => rule.required().assetRequired(),
      fields: [defineField({
        name: 'alt', title: 'Описание для доступности', type: 'string',
        description: 'Что изображено на обложке. Если не заполнено, сайт использует название публикации.',
      })],
    }),
    defineField({ name: 'place', title: 'Место издания', type: 'string', description: 'Также используется в фильтре Place. Пишите одинаковые места одинаково.', validation: (rule) => rule.required() }),
    defineField({ name: 'year', title: 'Год / период издания', type: 'string', description: 'Например: 1931 или 1931–1933. Используется в фильтре Year.', validation: (rule) => rule.required() }),
    defineField({ name: 'language', title: 'Язык', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'description', title: 'Описание публикации', type: 'array',
      of: [defineArrayMember({
        type: 'block', styles: [{ title: 'Абзац', value: 'normal' }], lists: [],
        marks: {
          decorators: [{ title: 'Жирный', value: 'strong' }, { title: 'Курсив', value: 'em' }],
          annotations: [defineArrayMember({
            name: 'link', title: 'Ссылка', type: 'object',
            fields: [defineField({ name: 'href', title: 'URL', type: 'url', validation: (rule) => rule.required().uri({ scheme: ['http', 'https', 'mailto'] }) })],
          })],
        },
      })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'order', title: 'Порядок в каталоге', type: 'number', initialValue: 0,
      description: 'Меньшее число — выше в списке. Первые 12 публикаций также отображаются на главной.',
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  orderings: [{ title: 'Порядок в каталоге', name: 'catalogueOrder', by: [{ field: 'order', direction: 'asc' }, { field: 'title', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'slug.current', media: 'cover' } },
})
