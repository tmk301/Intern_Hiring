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
    title: 'Placement',
    type: 'string',
    initialValue: 'bottom',
    options: {
      layout: 'radio',
      list: [
        {title: 'Top of page', value: 'top'},
        {title: 'After hero', value: 'afterHero'},
        {title: 'Bottom of page', value: 'bottom'},
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
