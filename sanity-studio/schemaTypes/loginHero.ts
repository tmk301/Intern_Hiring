import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

export const loginHero = defineType({
  name: 'loginHero',
  title: 'Login Hero',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title (mặc định)',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'titleVi',
      title: 'Title tiếng Việt',
      type: 'string',
    }),
    defineField({
      name: 'titleEn',
      title: 'Title tiếng Anh',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description (mặc định)',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'descriptionVi',
      title: 'Description tiếng Việt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Description tiếng Anh',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'securityText',
      title: 'Security Text (mặc định)',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'securityTextVi',
      title: 'Security Text tiếng Việt',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'securityTextEn',
      title: 'Security Text tiếng Anh',
      type: 'text',
      rows: 2,
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
      title: 'Form Title (mặc định)',
      type: 'string',
      initialValue: 'Đăng nhập',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formTitleVi',
      title: 'Form Title tiếng Việt',
      type: 'string',
    }),
    defineField({
      name: 'formTitleEn',
      title: 'Form Title tiếng Anh',
      type: 'string',
    }),
    defineField({
      name: 'formDescription',
      title: 'Form Description (mặc định)',
      type: 'text',
      rows: 2,
      initialValue: 'Nhập email và mật khẩu để truy cập tài khoản của bạn.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formDescriptionVi',
      title: 'Form Description tiếng Việt',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'formDescriptionEn',
      title: 'Form Description tiếng Anh',
      type: 'text',
      rows: 2,
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
