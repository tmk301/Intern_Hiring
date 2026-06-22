import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

const colorField = (name: string, title: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'string',
    initialValue,
    components: {
      input: ColorInput,
    },
    validation: (rule) =>
      rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
  })

const localizedTextFields = (name: string, title: string, type: 'string' | 'text' = 'string') => [
  defineField({
    name,
    title: `${title} (Default)`,
    type,
  }),
  defineField({
    name: `${name}Vi`,
    title: `${title} VI`,
    type,
  }),
  defineField({
    name: `${name}En`,
    title: `${title} EN`,
    type,
  }),
]

const sectionBaseFields = [
  defineField({
    name: 'isVisible',
    title: 'Visible',
    type: 'boolean',
    initialValue: true,
  }),
  defineField({
    name: 'placement',
    title: 'Vị trí chèn',
    type: 'string',
    initialValue: 'custom',
    options: {
      list: [
        {title: 'Tùy chọn — chèn cạnh bất kỳ phần tử nào', value: 'custom'},
        {title: 'Đầu trang (tương thích nội dung cũ)', value: 'top'},
        {title: 'Sau hero (tương thích nội dung cũ)', value: 'afterHero'},
        {title: 'Cuối trang (tương thích nội dung cũ)', value: 'bottom'},
      ],
    },
  }),
  defineField({
    name: 'targetSelector',
    title: 'Phần tử đích (CSS selector)',
    type: 'string',
    description: 'Ví dụ #gioi-thieu, #viec-lam-noi-bat hoặc main.',
    hidden: ({parent}) => parent?.placement !== 'custom',
    validation: (rule) => rule.custom((value, context) =>
      (context.parent as {placement?: string})?.placement !== 'custom' || value
        ? true
        : 'Nhập phần tử đích để chèn section.',
    ),
  }),
  defineField({
    name: 'insertPosition',
    title: 'Chèn ở đâu so với phần tử đích',
    type: 'string',
    initialValue: 'after',
    hidden: ({parent}) => parent?.placement !== 'custom',
    options: {
      layout: 'radio',
      list: [
        {title: 'Ngay trước', value: 'before'},
        {title: 'Ngay sau', value: 'after'},
        {title: 'Bên trong, ở đầu', value: 'insideStart'},
        {title: 'Bên trong, ở cuối', value: 'insideEnd'},
      ],
    },
  }),
  defineField({
    name: 'anchorId',
    title: 'Anchor ID',
    type: 'slug',
  }),
  colorField('backgroundColor', 'Background Color', '#ffffff'),
  colorField('textColor', 'Text Color', '#0f172a'),
  defineField({
    name: 'animation',
    title: 'Animation',
    type: 'string',
    initialValue: 'fadeUp',
    options: {
      list: [
        {title: 'None', value: 'none'},
        {title: 'Fade up', value: 'fadeUp'},
        {title: 'Fade in', value: 'fadeIn'},
        {title: 'Zoom in', value: 'zoomIn'},
        {title: 'Slide left', value: 'slideLeft'},
        {title: 'Slide right', value: 'slideRight'},
      ],
    },
  }),
  defineField({
    name: 'animationDelay',
    title: 'Animation Delay',
    type: 'number',
    initialValue: 0,
    validation: (rule) => rule.min(0).max(2000),
    hidden: ({parent}) => parent?.animation === 'none',
  }),
]

export const pageImageGallerySection = defineType({
  name: 'pageImageGallerySection',
  title: 'Image Gallery',
  type: 'object',

  fields: [
    ...sectionBaseFields,
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('description', 'Description', 'text'),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'alt',
              title: 'Alt text',
              type: 'string',
            },
            {
              name: 'href',
              title: 'Link URL',
              type: 'url',
              description: 'Optional. If empty, clicking opens the image file.',
            },
          ],
        },
      ],
      validation: (rule) => rule.min(1),
    }),
  ],

  preview: {
    select: {
      title: 'title',
      subtitle: 'placement',
      media: 'images.0',
    },
    prepare: ({title, subtitle, media}) => ({
      title: title || 'Image Gallery',
      subtitle,
      media,
    }),
  },
})
