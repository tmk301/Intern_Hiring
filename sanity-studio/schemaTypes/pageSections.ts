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
    description: 'Optional ID for navbar links or direct scrolling.',
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
    description: 'Delay in milliseconds.',
    initialValue: 0,
    validation: (rule) => rule.min(0).max(2000),
    hidden: ({parent}) => parent?.animation === 'none',
  }),
]

const imageFitField = defineField({
  name: 'imageFit',
  title: 'Image Fit',
  type: 'string',
  initialValue: 'contain',
  options: {
    layout: 'radio',
    list: [
      {title: 'Show full image', value: 'contain'},
      {title: 'Crop to fill', value: 'cover'},
    ],
  },
})

const localizedTextFields = (name: string, title: string, type: 'string' | 'text' = 'string', rows?: number) => [
  defineField({
    name,
    title: `${title} (Default)`,
    type,
    ...(rows ? {rows} : {}),
  }),
  defineField({
    name: `${name}Vi`,
    title: `${title} VI`,
    type,
    ...(rows ? {rows} : {}),
  }),
  defineField({
    name: `${name}En`,
    title: `${title} EN`,
    type,
    ...(rows ? {rows} : {}),
  }),
]

const descriptionStyleFields = (fontSize = 16) => [
  defineField({
    name: 'descriptionFontSize',
    title: 'Description Font Size',
    type: 'number',
    description: 'Font size in pixels.',
    initialValue: fontSize,
    validation: (rule) => rule.min(10).max(72),
  }),
  colorField('descriptionTextColor', 'Description Text Color', '#64748b'),
  defineField({
    name: 'descriptionFontWeight',
    title: 'Description Font Weight',
    type: 'string',
    initialValue: 'normal',
    options: {
      list: [
        {title: 'Light', value: '300'},
        {title: 'Normal', value: 'normal'},
        {title: 'Medium', value: '500'},
        {title: 'Semibold', value: '600'},
        {title: 'Bold', value: '700'},
      ],
    },
  }),
]

export const pageCtaButton = defineType({
  name: 'pageCtaButton',
  title: 'CTA Button',
  type: 'object',
  fields: [
    ...localizedTextFields('label', 'Label'),
    defineField({
      name: 'href',
      title: 'Link',
      type: 'string',
      description: 'Use an internal path like /jobs or a full URL.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      initialValue: 'primary',
      options: {
        layout: 'radio',
        list: [
          {title: 'Primary', value: 'primary'},
          {title: 'Secondary', value: 'secondary'},
          {title: 'Outline', value: 'outline'},
        ],
      },
    }),
  ],
})

export const pageCardItem = defineType({
  name: 'pageCardItem',
  title: 'Card Item',
  type: 'object',
  fields: [
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('description', 'Description', 'text', 3),
    ...descriptionStyleFields(14),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
    }),
    imageFitField,
    ...localizedTextFields('linkLabel', 'Link Label'),
    defineField({
      name: 'linkHref',
      title: 'Link',
      type: 'string',
    }),
    defineField({
      name: 'cardHref',
      title: 'Card Link',
      type: 'string',
      description: 'Optional. Makes the whole card clickable.',
    }),
    defineField({
      name: 'imageHref',
      title: 'Image Link',
      type: 'string',
      description: 'Optional. If empty, clicking the image opens the image itself.',
    }),
  ],
})

const flexibleItemBaseFields = [
  defineField({
    name: 'isVisible',
    title: 'Visible',
    type: 'boolean',
    initialValue: true,
  }),
  defineField({
    name: 'rounded',
    title: 'Rounded Corners',
    type: 'boolean',
    initialValue: true,
  }),
  defineField({
    name: 'padding',
    title: 'Block Padding',
    type: 'number',
    initialValue: 0,
    validation: (rule) => rule.min(0).max(80),
  }),
  colorField('backgroundColor', 'Background Color', '#ffffff'),
  colorField('textColor', 'Text Color', '#0f172a'),
]

export const pageFlexibleTextItem = defineType({
  name: 'pageFlexibleTextItem',
  title: 'Text Block',
  type: 'object',
  fields: [
    ...flexibleItemBaseFields,
    ...localizedTextFields('content', 'Content', 'text', 5),
    defineField({
      name: 'textStyle',
      title: 'Text Style',
      type: 'string',
      initialValue: 'body',
      options: {
        layout: 'radio',
        list: [
          {title: 'Eyebrow', value: 'eyebrow'},
          {title: 'Heading', value: 'heading'},
          {title: 'Body', value: 'body'},
        ],
      },
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      initialValue: 'left',
      options: {
        layout: 'radio',
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'content',
      subtitle: 'textStyle',
    },
  },
})

export const pageFlexibleImageItem = defineType({
  name: 'pageFlexibleImageItem',
  title: 'Image Block',
  type: 'object',
  fields: [
    ...flexibleItemBaseFields,
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    imageFitField,
    ...localizedTextFields('alt', 'Alt Text'),
    defineField({
      name: 'href',
      title: 'Link',
      type: 'string',
      description: 'Optional. If empty, clicking opens the image itself.',
    }),
  ],
  preview: {
    select: {
      title: 'alt',
      media: 'image',
    },
    prepare: ({title, media}) => ({
      title: title || 'Image',
      media,
    }),
  },
})

export const pageFlexibleButtonItem = defineType({
  name: 'pageFlexibleButtonItem',
  title: 'Button Block',
  type: 'object',
  fields: [
    ...flexibleItemBaseFields,
    ...localizedTextFields('label', 'Label'),
    defineField({
      name: 'href',
      title: 'Link',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'style',
      title: 'Style',
      type: 'string',
      initialValue: 'primary',
      options: {
        layout: 'radio',
        list: [
          {title: 'Primary', value: 'primary'},
          {title: 'Secondary', value: 'secondary'},
          {title: 'Outline', value: 'outline'},
        ],
      },
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      initialValue: 'left',
      options: {
        layout: 'radio',
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'href',
    },
  },
})

export const pageFlexibleCardItem = defineType({
  name: 'pageFlexibleCardItem',
  title: 'Card Block',
  type: 'object',
  fields: [
    ...flexibleItemBaseFields,
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('description', 'Description', 'text', 4),
    ...descriptionStyleFields(14),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
    }),
    imageFitField,
    defineField({
      name: 'href',
      title: 'Card Link',
      type: 'string',
      description: 'Optional. Makes the whole card clickable.',
    }),
    ...localizedTextFields('linkLabel', 'Link Label'),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
      media: 'image',
    },
  },
})

export const pageHeroSection = defineType({
  name: 'pageHeroSection',
  title: 'Hero Section',
  type: 'object',
  fields: [
    ...sectionBaseFields,
    ...localizedTextFields('eyebrow', 'Eyebrow'),
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('description', 'Description', 'text', 4),
    ...descriptionStyleFields(18),
    defineField({
      name: 'image',
      title: 'Background Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'buttons',
      title: 'Buttons',
      type: 'array',
      of: [{type: 'pageCtaButton'}],
      validation: (rule) => rule.max(2),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'placement',
      media: 'image',
    },
  },
})

export const pageTextSection = defineType({
  name: 'pageTextSection',
  title: 'Text Section',
  type: 'object',
  fields: [
    ...sectionBaseFields,
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('body', 'Body', 'text', 6),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      initialValue: 'center',
      options: {
        layout: 'radio',
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'placement',
    },
  },
})

export const pageCardGridSection = defineType({
  name: 'pageCardGridSection',
  title: 'Card Grid Section',
  type: 'object',
  fields: [
    ...sectionBaseFields,
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('description', 'Description', 'text', 3),
    ...descriptionStyleFields(16),
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      of: [{type: 'pageCardItem'}],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'placement',
    },
  },
})

export const pageImageTextSection = defineType({
  name: 'pageImageTextSection',
  title: 'Image + Text Section',
  type: 'object',
  fields: [
    ...sectionBaseFields,
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('body', 'Body', 'text', 5),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    imageFitField,
    defineField({
      name: 'imagePosition',
      title: 'Image Position',
      type: 'string',
      initialValue: 'right',
      options: {
        layout: 'radio',
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Right', value: 'right'},
        ],
      },
    }),
    defineField({
      name: 'imageHref',
      title: 'Image Link',
      type: 'string',
      description: 'Optional. If empty, clicking the image opens the image itself.',
    }),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'pageCtaButton',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'placement',
      media: 'image',
    },
  },
})

export const pageCtaSection = defineType({
  name: 'pageCtaSection',
  title: 'CTA Section',
  type: 'object',
  fields: [
    ...sectionBaseFields,
    ...localizedTextFields('title', 'Title'),
    ...localizedTextFields('description', 'Description', 'text', 3),
    ...descriptionStyleFields(16),
    defineField({
      name: 'button',
      title: 'Button',
      type: 'pageCtaButton',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'placement',
    },
  },
})

export const pageFlexibleSection = defineType({
  name: 'pageFlexibleSection',
  title: 'Flexible Section',
  type: 'object',
  fields: [
    ...sectionBaseFields,
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      initialValue: 'grid',
      options: {
        layout: 'radio',
        list: [
          {title: 'Stack', value: 'stack'},
          {title: 'Grid', value: 'grid'},
        ],
      },
    }),
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'number',
      initialValue: 2,
      validation: (rule) => rule.min(1).max(4),
      hidden: ({parent}) => parent?.layout === 'stack',
    }),
    defineField({
      name: 'gap',
      title: 'Gap',
      type: 'number',
      initialValue: 24,
      validation: (rule) => rule.min(0).max(80),
    }),
    defineField({
      name: 'paddingY',
      title: 'Vertical Padding',
      type: 'number',
      initialValue: 56,
      validation: (rule) => rule.min(0).max(160),
    }),
    defineField({
      name: 'maxWidth',
      title: 'Max Width',
      type: 'string',
      initialValue: 'xl',
      options: {
        list: [
          {title: 'Small', value: 'sm'},
          {title: 'Medium', value: 'md'},
          {title: 'Large', value: 'lg'},
          {title: 'Extra Large', value: 'xl'},
          {title: 'Full', value: 'full'},
        ],
      },
    }),
    defineField({
      name: 'items',
      title: 'Blocks',
      type: 'array',
      of: [
        {type: 'pageFlexibleTextItem'},
        {type: 'pageFlexibleImageItem'},
        {type: 'pageFlexibleButtonItem'},
        {type: 'pageFlexibleCardItem'},
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: {
      subtitle: 'placement',
    },
    prepare: ({subtitle}) => ({
      title: 'Flexible Section',
      subtitle,
    }),
  },
})

export const pageSpacerSection = defineType({
  name: 'pageSpacerSection',
  title: 'Spacer Section',
  type: 'object',
  fields: [
    ...sectionBaseFields,
    defineField({
      name: 'height',
      title: 'Height',
      type: 'number',
      initialValue: 48,
      validation: (rule) => rule.min(8).max(160),
    }),
  ],
  preview: {
    prepare: () => ({
      title: 'Spacer',
    }),
  },
})
