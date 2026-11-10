import { defineField, defineType } from 'sanity'
import { ImageIcon } from '@sanity/icons/Image'

export default defineType({
  name: 'researchImage',
  title: 'Изображение в статье',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({ name: 'image', title: 'Изображение', type: 'image', options: { hotspot: true }, validation: (rule) => rule.required() }),
    defineField({ name: 'alt', title: 'Описание для доступности', type: 'string', description: 'Что изображено на картинке. Используется экранными дикторами.', validation: (rule) => rule.required() }),
    defineField({ name: 'caption', title: 'Подпись', type: 'text', rows: 2 }),
    defineField({ name: 'credit', title: 'Источник / автор изображения', type: 'string' }),
  ],
  preview: {
    select: { title: 'caption', subtitle: 'alt', media: 'image' },
    prepare: ({ title, subtitle, media }) => ({ title: title || subtitle || 'Изображение', subtitle, media }),
  },
})
