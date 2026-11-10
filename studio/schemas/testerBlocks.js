import { defineArrayMember, defineField } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { characterStyles, testerStyleLabels, fontNames } from '../../shared/typefaceStyles'

const fontOptions = Object.keys(characterStyles).map((value) => ({ title: fontNames[value], value }))
const styleOptions = [...new Set(Object.keys(characterStyles).flatMap(testerStyleLabels))]

function settingsField(name, title, mobile = false) {
  return defineField({
    name, title, type: 'object',
    description: mobile
      ? 'Экраны до 800px включительно. Пустые параметры наследуются от десктопа. При переходе между режимами тестер сбрасывается к настройкам соответствующего экрана.'
      : 'Размер указывается точно в px, без автоматического уменьшения или обрезания текста.',
    options: { collapsible: true, collapsed: mobile },
    fields: [
      defineField({ name: 'fontKey', title: 'Семейство шрифта', type: 'string', options: { list: [{ title: mobile ? 'Как на десктопе' : 'Семейство текущей страницы', value: 'inherit' }, ...fontOptions] } }),
      defineField({
        name: 'style', title: 'Начертание', type: 'string',
        description: 'Выберите начертание, которое существует в выбранном семействе. Italic — курсив. Russo One Regular — второе начертание Roboto Condensed / Russo One.',
        options: { list: [{ title: mobile ? 'Как на десктопе / доступное по умолчанию' : 'Доступное по умолчанию', value: 'inherit' }, ...styleOptions] },
      }),
      defineField({ name: 'fontSize', title: 'Размер текста (px)', type: 'number', description: 'Фиксированный размер. При включённой подгонке по ширине размер вычисляется автоматически.', validation: (rule) => rule.integer().min(12).max(1000) }),
      defineField({
        name: 'autoFit', title: 'Подгонять текст по ширине', type: 'boolean', options: { layout: 'checkbox' },
        description: mobile
          ? 'Автоматический размер для мобильных: текст уменьшается при сужении блока. Если поле не задано, наследуется настройка десктопа. Снятый чекбокс отключает подгонку. Используется одна колонка, текст не сокращается.'
          : 'Автоматически заполнять ширину блока (до 1000px). При сужении экрана размер уменьшается. Фиксированный размер выше игнорируется; используется одна колонка. Текст не сокращается.',
      }),
      defineField({ name: 'lineHeight', title: 'Высота строки', description: 'Множитель: 1 — ровно размер шрифта, 1.2 — на 20% больше.', type: 'number', validation: (rule) => rule.min(0.85).max(2) }),
      defineField({ name: 'letterSpacing', title: 'Расстояние между буквами (em)', description: '0 — обычное, 0.02 — разрядка, -0.02 — плотнее.', type: 'number', validation: (rule) => rule.min(-0.08).max(0.1) }),
      defineField({ name: 'align', title: 'Выравнивание', type: 'string', options: { list: [{ title: 'Слева', value: 'left' }, { title: 'По центру', value: 'center' }] } }),
      defineField({ name: 'columns', title: 'Количество колонок текста', type: 'number', options: { list: [1, 2, 3] }, validation: (rule) => rule.integer().min(1).max(3) }),
    ],
    validation: (rule) => rule.custom((value, context) => {
      if (!value?.style || value.style === 'inherit') return true
      const parentFont = mobile ? context.parent?.desktop?.fontKey : null
      const fontKey = value.fontKey && value.fontKey !== 'inherit' ? value.fontKey
        : parentFont && parentFont !== 'inherit' ? parentFont : context.document?.fontKey
      return !fontKey || testerStyleLabels(fontKey).includes(value.style) || 'Это начертание отсутствует в выбранном семействе.'
    }),
  })
}

export const testerBlocksField = defineField({
  name: 'testerBlocks', title: 'Блоки тестеров', type: 'array', group: 'samples',
  description: 'Добавляйте, удаляйте и перетаскивайте блоки. Можно оставить список пустым, чтобы убрать все тестеры. Reset на сайте восстанавливает настройки текущего экрана.',
  hidden: ({ document }) => document?.testerMode !== 'custom',
  of: [defineArrayMember({
    name: 'typeTester', title: 'Тестер', type: 'object', icon: DocumentTextIcon,
    initialValue: { desktop: { fontSize: 72, lineHeight: 1, letterSpacing: 0, align: 'left', columns: 1 } },
    fields: [
      defineField({ name: 'label', title: 'Название блока в редакторе', type: 'string', description: 'Не отображается на сайте.' }),
      defineField({ name: 'text', title: 'Начальный текст', type: 'text', rows: 4 }),
      defineField({ name: 'mobileText', title: 'Текст для мобильного экрана', type: 'text', rows: 3, description: 'Необязательно. Если поле не заполнено, используется основной текст.' }),
      settingsField('desktop', 'Десктоп'),
      settingsField('mobile', 'Мобильные устройства', true),
    ],
    preview: {
      select: { label: 'label', text: 'text', size: 'desktop.fontSize' },
      prepare: ({ label, text, size }) => ({ title: label || text || 'Тестер', subtitle: size ? `${size}px — отдельные настройки для мобильных` : 'Размер по умолчанию: 72px' }),
    },
  })],
})
