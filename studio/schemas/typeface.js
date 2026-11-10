import { defineArrayMember, defineField, defineType } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { ImageIcon } from '@sanity/icons/Image'
import { testerBlocksField } from './testerBlocks'

const fonts = [
  { title: 'Unbounded — Light, Regular, Bold', value: 'unbounded' },
  { title: 'Roboto Condensed SemiBold / Russo One Regular', value: 'roboto-condensed-russo-one' },
  { title: 'Source Serif 4 — Regular, Medium, Bold, Black + Italic', value: 'source-serif-4' },
  { title: 'Ruslan Display — Bold', value: 'ruslan-display' },
  { title: 'Inter — Regular, Bold + Italic', value: 'inter' },
]

export default defineType({
  name: 'typeface', title: 'Typefaces — шрифты', type: 'document', icon: DocumentTextIcon,
  groups: [
    { name: 'main', title: 'Карточка', default: true },
    { name: 'body', title: 'Описание и изображения' },
    { name: 'samples', title: 'Тестеры' },
    { name: 'facts', title: 'Сведения о шрифте' },
  ],
  fields: [
    defineField({ name: 'name', title: 'Название', type: 'string', group: 'main', validation: (rule) => rule.required() }),
    defineField({
      name: 'slug', title: 'Адрес страницы', type: 'slug', group: 'main',
      options: { source: 'name', maxLength: 96 },
      description: 'Сохраните текущие адреса: unbounded, roboto-condensed-russo-one, source-serif-4, ruslan-display, inter. Не меняйте после публикации без перенаправления.',
      validation: (rule) => rule.required().custom((value) => !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || 'Используйте латинские строчные буквы, цифры и дефисы.'),
    }),
    defineField({
      name: 'fontKey', title: 'Подключённое семейство шрифта', type: 'string', group: 'main',
      options: { list: fonts }, validation: (rule) => rule.required().valid(fonts.map(({ value }) => value)),
      description: 'Определяет реальные начертания, тестеры и глифы. Файлы шрифтов подключены в коде. Для совершенно нового семейства потребуется разработчик.',
    }),
    defineField({ name: 'order', title: 'Порядок в каталоге', type: 'number', group: 'main', initialValue: 0, description: 'Меньшее число — выше. На главной код выбирает Unbounded и Source Serif 4.', validation: (rule) => rule.integer().min(0) }),
    defineField({
      name: 'body', title: 'Описание шрифта', type: 'array', group: 'body', validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Абзац', value: 'normal' }, { title: 'Подзаголовок', value: 'h2' }, { title: 'Цитата', value: 'blockquote' }],
          lists: [{ title: 'Список', value: 'bullet' }, { title: 'Нумерованный список', value: 'number' }],
          marks: {
            decorators: [{ title: 'Жирный', value: 'strong' }, { title: 'Курсив', value: 'em' }],
            annotations: [defineArrayMember({ name: 'link', title: 'Ссылка', type: 'object', fields: [defineField({ name: 'href', title: 'URL', type: 'url', validation: (rule) => rule.required().uri({ scheme: ['http', 'https', 'mailto'] }) })] })],
          },
        }),
        defineArrayMember({
          name: 'typefaceImage', title: 'Изображение', type: 'object', icon: ImageIcon,
          fields: [
            defineField({ name: 'image', title: 'Изображение', type: 'image', options: { hotspot: true }, validation: (rule) => rule.required().assetRequired() }),
            defineField({ name: 'alt', title: 'Описание для доступности', type: 'string', description: 'Что изображено. Не является подписью под фото.', validation: (rule) => rule.required() }),
            defineField({ name: 'caption', title: 'Подпись под изображением', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'caption', subtitle: 'alt', media: 'image' } },
        }),
      ],
    }),
    defineField({
      name: 'testerMode', title: 'Режим тестеров', type: 'string', group: 'samples', initialValue: 'custom',
      description: 'Для существующей страницы выберите настраиваемый список. Старые тексты сохраняются: можно вернуться к прежним шести блокам. Пока режим не выбран, действует прежняя версия.',
      options: { list: [{ title: 'Настраиваемый список блоков', value: 'custom' }, { title: 'Прежние шесть блоков', value: 'legacy' }], layout: 'radio' },
    }),
    testerBlocksField,
    defineField({
      name: 'samples', title: 'Старые тексты шести тестеров', type: 'object', group: 'samples',
      deprecated: { reason: 'Для гибкого количества и параметров используйте настраиваемый список блоков.' },
      readOnly: true,
      hidden: ({ document, value }) => document?.testerMode === 'custom' || value === undefined,
      description: 'Сохранено для совместимости с прежними страницами. Данные не удаляются при переключении на настраиваемые блоки.',
      fields: [
        ['displayPrimary', 'Первый крупный тестер'], ['reading', 'Тестер для чтения'],
        ['twoColumn', 'Тестер в две колонки'], ['displaySecondary', 'Второй крупный тестер'],
        ['threeColumn', 'Тестер в три колонки'], ['cyrillic', 'Последний крупный тестер'],
      ].map(([name, title]) => defineField({ name, title, type: 'text', rows: 3 })),
    }),
    ...[
      ['releaseDate', 'Дата выпуска', 'string'], ['version', 'Версия', 'string'],
      ['formats', 'Доступные форматы', 'string'], ['variableFile', 'Информация о variable-файле', 'text'],
      ['designer', 'Дизайнер / автор', 'string'], ['openTypeFeatures', 'OpenType-функции', 'text'],
      ['supportedLanguages', 'Поддерживаемые языки', 'text'], ['trialInfo', 'Как получить пробную версию', 'text'],
    ].map(([name, title, type]) => defineField({ name, title, type, group: 'facts' })),
  ],
  preview: { select: { title: 'name', subtitle: 'fontKey' } },
  orderings: [{ title: 'Порядок в каталоге', name: 'catalogueOrder', by: [{ field: 'order', direction: 'asc' }, { field: 'name', direction: 'asc' }] }],
})
