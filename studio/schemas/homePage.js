import { defineArrayMember, defineField, defineType } from 'sanity'
import { HomeIcon } from '@sanity/icons/Home'

export default defineType({
  name: 'homePage',
  // Archive only: keep the schema for existing cloud documents, not for editing.
  readOnly: true,
  title: 'Главная страница',
  type: 'document',
  icon: HomeIcon,
  fields: [
    {
      name: 'heroImage',
      title: 'Картинка Баннера (ÉMIGRÉ)',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'description',
      title: 'Главный текст-описание',
      type: 'text',
    },
    defineField({
      name: 'featuredResearch',
      title: 'Research — статьи на главной',
      description: 'Выберите статьи и перетащите их в нужном порядке. Название и описание берутся из самой статьи.',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'researchArticle' }] })],
      validation: (rule) => rule.unique().max(2).warning('Дизайн главной рассчитан на две статьи.'),
    }),
    // Legacy data is preserved until the content has been migrated.
    {
      name: 'researchCards',
      title: 'Карточки Research',
      description: 'Старые карточки. Для новых материалов используйте ссылки на статьи выше.',
      readOnly: true,
      hidden: ({ value }) => value === undefined,
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Заголовок', type: 'string' },
            { name: 'summary', title: 'Краткое описание', type: 'text' },
            { name: 'link', title: 'Ссылка/Slug', type: 'string' },
          ],
        },
      ],
    },
    {
      name: 'publicationsCards',
      title: 'Обложки Публикаций',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Название обложки', type: 'string' },
            { name: 'image', title: 'Изображение', type: 'image' },
          ],
        },
      ],
    },
    {
      name: 'typefacesCards',
      title: 'Карточки Шрифтов',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Название шрифта', type: 'string' },
            { name: 'previewText', title: 'Пример начертаний (текст)', type: 'text' },
          ],
        },
      ],
    },
  ],
})
