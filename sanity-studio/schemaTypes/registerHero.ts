import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

export const registerHero = defineType({
  name: 'registerHero',
  title: 'Register Hero',
  type: 'document',
  fields: [
    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'string',
      initialValue: 'New candidate',
      validation: (rule) => rule.required(),
    }),
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
      name: 'noteTitle',
      title: 'Bottom Card Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'noteText',
      title: 'Bottom Card Text',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Background Color',
      type: 'string',
      initialValue: '#f1f5f9',
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
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'formTitle',
      title: 'Form Title',
      type: 'string',
      initialValue: 'Đăng ký tài khoản',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formDescription',
      title: 'Form Description',
      type: 'text',
      rows: 2,
      initialValue: 'Hoàn tất thông tin bên dưới để tạo tài khoản ứng viên.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lastNameLabel',
      title: 'Last Name Label',
      type: 'string',
      initialValue: 'Họ',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lastNamePlaceholder',
      title: 'Last Name Placeholder',
      type: 'string',
      initialValue: 'Nguyen',
    }),
    defineField({
      name: 'firstNameLabel',
      title: 'First Name Label',
      type: 'string',
      initialValue: 'Tên',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'firstNamePlaceholder',
      title: 'First Name Placeholder',
      type: 'string',
      initialValue: 'An',
    }),
    defineField({
      name: 'emailLabel',
      title: 'Email Label',
      type: 'string',
      initialValue: 'Email',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'emailPlaceholder',
      title: 'Email Placeholder',
      type: 'string',
      initialValue: 'ten@example.com',
    }),
    defineField({
      name: 'phoneLabel',
      title: 'Phone Label',
      type: 'string',
      initialValue: 'Số điện thoại',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'phonePlaceholder',
      title: 'Phone Placeholder',
      type: 'string',
      initialValue: '0901234567',
    }),
    defineField({
      name: 'passwordLabel',
      title: 'Password Label',
      type: 'string',
      initialValue: 'Mật khẩu',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'passwordPlaceholder',
      title: 'Password Placeholder',
      type: 'string',
      initialValue: 'Tối thiểu 6 ký tự',
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
