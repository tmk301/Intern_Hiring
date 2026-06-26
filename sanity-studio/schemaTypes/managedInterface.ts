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

export const managedInterfaceText = defineType({
  name: 'managedInterfaceText',
  title: 'Interface Custom Text Item',
  type: 'object',
  fields: [
    defineField({
      name: 'key',
      title: 'Content Translation Key ID',
      type: 'string',
      description: 'The static dictionary key code from the frontend, e.g. home.heroSubtitle.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Helpful Identifier Label',
      type: 'string',
      description: 'A readable display label to identify what part of the page this text belongs to.',
    }),
    defineField({
      name: 'isVisible',
      title: 'Show Item',
      type: 'boolean',
      initialValue: true,
      description: 'Toggle off to hide the corresponding component on the frontend.',
    }),
    defineField({
      name: 'value',
      title: 'Content (Default)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'valueVi',
      title: 'Content VI',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'valueEn',
      title: 'Content EN',
      type: 'text',
      rows: 3,
    }),
    colorField('textColor', 'Text Color Accent', '#0f172a'),
    colorField('backgroundColor', 'Background Block Color', '#ffffff'),
    colorField('borderColor', 'Border Outline Color', '#e2e8f0'),
    defineField({
      name: 'image',
      title: 'Media Asset',
      type: 'image',
      options: {hotspot: true},
      description: 'Optional illustration image. Will render on supported frontend pages.',
    }),
  ],
  preview: {
    select: {
      title: 'label',
      subtitle: 'key',
    },
    prepare: ({title, subtitle}) => ({
      title: title || subtitle,
      subtitle,
    }),
  },
})

export const managedInterface = defineType({
  name: 'managedInterface',
  title: 'Default Content Manager',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'routePath',
      title: 'Page Route Path',
      type: 'string',
      description: 'Matches the page routing paths on the frontend. Login & Register sections are handled separately.',
      initialValue: '/',
      options: {
        list: [
          {title: 'Home Page', value: '/'},
          {title: 'Jobs Page', value: '/jobs'},
          {title: 'Profile Page', value: '/profile'},
          {title: 'Applications Page', value: '/applications'},
          {title: 'Recruiter Verification Page', value: '/recruiter-verification'},
          {title: 'Recruiter Dashboard', value: '/recruiter'},
          {title: 'Admin Dashboard', value: '/admin'},
          {title: 'Moderator Dashboard', value: '/moderator'},
        ],
      },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === '/login' || value === '/register'
              ? 'Login and Register pages are managed via dedicated schemas in Sanity.'
              : true,
          ),
    }),
    defineField({
      name: 'texts',
      title: 'Default Interface Text Items List',
      type: 'array',
      of: [{type: 'managedInterfaceText'}],
    }),
    defineField({
      name: 'theme',
      title: 'Accent Styles & Colors',
      type: 'object',
      fields: [
        colorField('pageBackgroundColor', 'Page Body Background Color', '#f8fafc'),
        colorField('headerBackgroundColor', 'Page Header Accent Background Color', '#ffffff'),
        colorField('headerTextColor', 'Page Header Title & Icons Color', '#0f172a'),
        colorField('bodyTextColor', 'General Text Body Color', '#0f172a'),
        colorField('mutedTextColor', 'Supporting Subtitles & Borders Text Color', '#64748b'),
        colorField('cardBackgroundColor', 'Section Grid Card Background Color', '#ffffff'),
        colorField('cardBorderColor', 'Section Grid Card Border Color', '#e2e8f0'),
        colorField('accentColor', 'Action Buttons & Focus States Accent Color', '#2563eb'),
      ],
    }),
    defineField({
      name: 'images',
      title: 'Interface Media Assets',
      type: 'object',
      fields: [
        defineField({
          name: 'headerImage',
          title: 'Top Banner Background Image',
          type: 'image',
          options: {hotspot: true},
        }),
      ],
    }),
    defineField({
      name: 'navbar',
      title: 'Top Navigation Menu Config',
      type: 'object',
      description: 'Configures navbar components globally. Best updated inside the Home Page document settings.',
      fields: [
        defineField({
          name: 'isEnabled',
          title: 'Use custom navigation settings',
          type: 'boolean',
          initialValue: false,
        }),
        ...localizedTextFields('brandName', 'Brand Title text'),
        defineField({
          name: 'logo',
          title: 'Navbar Brand Logo Asset',
          type: 'image',
          options: {hotspot: true},
        }),
        defineField({
          name: 'showTopBar',
          title: 'Show Global Notification Bar',
          type: 'boolean',
          initialValue: false,
        }),
        ...localizedTextFields('topBarText', 'Notification Bar Message String'),
        colorField('topBarBackgroundColor', 'Notification Bar Background Color', '#0b3f8a'),
        colorField('topBarTextColor', 'Notification Bar Text Color', '#ffffff'),
        colorField('backgroundColor', 'Navigation Menu Background Color', '#ffffff'),
        colorField('textColor', 'Navigation Links Base Color', '#0f172a'),
        colorField('accentColor', 'Navigation Links Highlight Color', '#2563eb'),
        colorField('buttonBackgroundColor', 'Primary CTA (Login) Background Color', '#2563eb'),
        colorField('buttonTextColor', 'Primary CTA (Login) Text Color', '#ffffff'),
        defineField({
          name: 'items',
          title: 'Navigation Menu Links',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({
                  name: 'isVisible',
                  title: 'Show Link',
                  type: 'boolean',
                  initialValue: true,
                }),
                ...localizedTextFields('label', 'Link Display Name'),
                defineField({
                  name: 'targetId',
                  title: 'Page Anchor Target Section ID',
                  type: 'string',
                  description: 'Scrolls directly to this section ID on click. (e.g. gioi-thieu).',
                }),
                defineField({
                  name: 'path',
                  title: 'Destination Page Route Path',
                  type: 'string',
                  description: 'Redirects users to this page route. (e.g. /jobs, /profile). Takes priority over Anchor Target ID.',
                }),
              ],
              preview: {
                select: {
                  title: 'label',
                  subtitle: 'path',
                },
              },
            },
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'routePath',
    },
  },
})
