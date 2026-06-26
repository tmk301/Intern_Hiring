import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

const colorField = (name: string, title: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'string',
    initialValue,
    components: {input: ColorInput},
    validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {name: 'HEX color'}),
  })

const defaultItems = [
  {_type: 'headerMenuItem', _key: 'about', isVisible: true, labelVi: 'Giới thiệu', labelEn: 'About', targetId: 'gioi-thieu'},
  {_type: 'headerMenuItem', _key: 'featured', isVisible: true, labelVi: 'Việc làm nổi bật', labelEn: 'Featured jobs', targetId: 'viec-lam-noi-bat'},
  {_type: 'headerMenuItem', _key: 'partners', isVisible: true, labelVi: 'Đối tác', labelEn: 'Partners', targetId: 'doi-tac'},
  {_type: 'headerMenuItem', _key: 'recruitment', isVisible: true, labelVi: 'Tuyển dụng', labelEn: 'Recruitment', targetId: 'tuyen-dung'},
]

export const headerMenuItem = defineType({
  name: 'headerMenuItem',
  title: 'Header Navigation Item',
  type: 'object',
  fields: [
    defineField({name: 'isVisible', title: 'Show Item', type: 'boolean', initialValue: true}),
    defineField({name: 'labelVi', title: 'Label VI', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'labelEn', title: 'Label EN', type: 'string'}),
    colorField('textColor', 'Custom Text Color', '#0f172a'),
    defineField({
      name: 'targetId',
      title: 'Anchor Target ID',
      type: 'string',
      description: 'Example: gioi-thieu. Will scroll to this element ID on the home page. Omit if using page route path.',
    }),
    defineField({
      name: 'path',
      title: 'Destination Page Route Path',
      type: 'string',
      description: 'Example: /jobs. Route path takes priority over Anchor Target ID.',
    }),
  ],
  validation: (rule) => rule.custom((value) => value?.path || value?.targetId ? true : 'Please enter either a Destination Page Route Path or an Anchor Target ID.'),
  preview: {
    select: {title: 'labelEn', titleVi: 'labelVi', subtitle: 'path', targetId: 'targetId', isVisible: 'isVisible'},
    prepare: ({title, titleVi, subtitle, targetId, isVisible}) => ({
      title: title || titleVi || 'Navigation Link Item',
      subtitle: `${isVisible === false ? 'Hidden · ' : ''}${subtitle || targetId || ''}`,
    }),
  },
})

export const siteHeader = defineType({
  name: 'siteHeader',
  title: 'Global Header & Navbar Configuration',
  type: 'document',
  description: 'Manages the navigation links globally for the website. Custom user authentication CTAs (Login/Register) are fixed on the frontend.',
  initialValue: {
    title: 'Primary Header',
    isEnabled: true,
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    items: defaultItems,
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Configuration Profile Name',
      type: 'string',
      initialValue: 'Primary Header',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isEnabled',
      title: 'Enable Custom Navigation Menu',
      type: 'boolean',
      initialValue: true,
      description: 'Disable to fall back to default frontend hardcoded navigation items.',
    }),
    colorField('backgroundColor', 'Header Background Color', '#ffffff'),
    colorField('textColor', 'Navigation Text Color Accent', '#0f172a'),
    defineField({
      name: 'items',
      title: 'Navigation Menu Link Items',
      type: 'array',
      initialValue: defaultItems,
      description: 'Add, edit, remove, hide, or drag and drop links to reorder.',
      of: [{type: 'headerMenuItem'}],
    }),
  ],
  preview: {select: {title: 'title'}, prepare: ({title}) => ({title: title || 'Primary Header'})},
})
