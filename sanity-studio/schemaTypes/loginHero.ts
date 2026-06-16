import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

export const loginHero = defineType({
  name: 'loginHero',
  title: 'Login Hero',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'securityText',
      title: 'Security Text',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Background Color',
      type: 'string',
      initialValue: '#2563eb',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'textColor',
      title: 'Text Color',
      type: 'string',
      initialValue: '#ffffff',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'formTitle',
      title: 'Form Title',
      type: 'string',
      initialValue: '\u0110\u0103ng nh\u1eadp',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formDescription',
      title: 'Form Description',
      type: 'text',
      rows: 2,
      initialValue: 'Nh\u1eadp email v\u00e0 m\u1eadt kh\u1ea9u \u0111\u1ec3 truy c\u1eadp t\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formTitleTextColor',
      title: 'Form Title Text Color',
      type: 'string',
      initialValue: '#0f172a',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'formDescriptionTextColor',
      title: 'Form Description Text Color',
      type: 'string',
      initialValue: '#64748b',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'footerTextColor',
      title: 'Footer Text Color',
      type: 'string',
      initialValue: '#64748b',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'linkTextColor',
      title: 'Link Text Color',
      type: 'string',
      initialValue: '#2563eb',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'pageBackgroundColor',
      title: 'Login Page Background Color',
      type: 'string',
      initialValue: '#f8fafc',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'formBackgroundColor',
      title: 'Form Background Color',
      type: 'string',
      initialValue: '#ffffff',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'inputBackgroundColor',
      title: 'Input Background Color',
      type: 'string',
      initialValue: '#ffffff',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'inputTextColor',
      title: 'Input Text Color',
      type: 'string',
      initialValue: '#0f172a',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'inputBorderColor',
      title: 'Input Border Color',
      type: 'string',
      initialValue: '#e2e8f0',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
    defineField({
      name: 'labelTextColor',
      title: 'Label Text Color',
      type: 'string',
      initialValue: '#0f172a',
      components: {
        input: ColorInput,
      },
      validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {
        name: 'hex color',
        invert: false,
      }),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
      media: 'image',
    },
  },
})
