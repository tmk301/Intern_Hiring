import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

export const loginHero = defineType({
  name: 'loginHero',
  title: 'Login Form Customizer',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Hero Welcome Header (Default)',
      type: 'string',
      placeholder: 'Chào mừng quay lại với InternHiring',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'titleVi',
      title: 'Hero Welcome Header VI',
      type: 'string',
      placeholder: 'Chào mừng quay lại với InternHiring',
    }),
    defineField({
      name: 'titleEn',
      title: 'Hero Welcome Header EN',
      type: 'string',
      placeholder: 'Welcome back to InternHiring',
    }),
    defineField({
      name: 'description',
      title: 'Hero Description Paragraph (Default)',
      type: 'text',
      rows: 3,
      placeholder: 'Tiếp tục kết nối với các chương trình thực tập, công ty đối tác và cơ hội phát triển nghề nghiệp.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'descriptionVi',
      title: 'Hero Description Paragraph VI',
      type: 'text',
      rows: 3,
      placeholder: 'Tiếp tục kết nối với các chương trình thực tập, công ty đối tác và cơ hội phát triển nghề nghiệp.',
    }),
    defineField({
      name: 'descriptionEn',
      title: 'Hero Description Paragraph EN',
      type: 'text',
      rows: 3,
      placeholder: 'Continue connecting with internship programs, partner companies, and career development opportunities.',
    }),
    defineField({
      name: 'securityText',
      title: 'Hero Footer Security Badge Label (Default)',
      type: 'text',
      rows: 2,
      placeholder: 'Tài khoản được xác thực qua Supabase Auth và đồng bộ với hồ sơ ứng viên.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'securityTextVi',
      title: 'Hero Footer Security Badge Label VI',
      type: 'text',
      rows: 2,
      placeholder: 'Tài khoản được xác thực qua Supabase Auth và đồng bộ với hồ sơ ứng viên.',
    }),
    defineField({
      name: 'securityTextEn',
      title: 'Hero Footer Security Badge Label EN',
      type: 'text',
      rows: 2,
      placeholder: 'Accounts are verified through Supabase Auth and synced with candidate profiles.',
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Left Block Background Color',
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
      title: 'Left Block Text Color Accent',
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
      title: 'Left Block Side Illustration',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'formTitle',
      title: 'Form Heading H1 (Default)',
      type: 'string',
      initialValue: 'Đăng nhập',
      placeholder: 'Đăng nhập',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formTitleVi',
      title: 'Form Heading H1 VI',
      type: 'string',
      placeholder: 'Đăng nhập',
    }),
    defineField({
      name: 'formTitleEn',
      title: 'Form Heading H1 EN',
      type: 'string',
      placeholder: 'Log in',
    }),
    defineField({
      name: 'formDescription',
      title: 'Form Supporting Subtitle (Default)',
      type: 'text',
      rows: 2,
      initialValue: 'Nhập email và mật khẩu để truy cập tài khoản của bạn.',
      placeholder: 'Nhập email và mật khẩu để truy cập tài khoản của bạn.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formDescriptionVi',
      title: 'Form Supporting Subtitle VI',
      type: 'text',
      rows: 2,
      placeholder: 'Nhập email và mật khẩu để truy cập tài khoản của bạn.',
    }),
    defineField({
      name: 'formDescriptionEn',
      title: 'Form Supporting Subtitle EN',
      type: 'text',
      rows: 2,
      placeholder: 'Enter email and password to access your account.',
    }),
    defineField({
      name: 'formTitleTextColor',
      title: 'Form Heading text Color',
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
      title: 'Form Subtitle text Color',
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
      title: 'Form Bottom Text Color',
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
      title: 'Form Action Links Color Accent',
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
      title: 'Outer Layout Background Color',
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
      title: 'Form Card Background Color',
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
      title: 'Inputs Field Background Color',
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
      title: 'Inputs Field Typed Text Color',
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
      title: 'Inputs Field Outline Border Color',
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
      title: 'Form Input Labels Color',
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
