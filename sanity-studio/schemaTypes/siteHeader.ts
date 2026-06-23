import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

const colorField = (name: string, title: string, initialValue: string) =>
  defineField({
    name,
    title,
    type: 'string',
    initialValue,
    components: {input: ColorInput},
    validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {name: 'màu HEX'}),
  })

const defaultItems = [
  {_type: 'headerMenuItem', _key: 'about', isVisible: true, labelVi: 'Giới thiệu', labelEn: 'About', targetId: 'gioi-thieu'},
  {_type: 'headerMenuItem', _key: 'featured', isVisible: true, labelVi: 'Việc làm nổi bật', labelEn: 'Featured jobs', targetId: 'viec-lam-noi-bat'},
  {_type: 'headerMenuItem', _key: 'partners', isVisible: true, labelVi: 'Đối tác', labelEn: 'Partners', targetId: 'doi-tac'},
  {_type: 'headerMenuItem', _key: 'recruitment', isVisible: true, labelVi: 'Tuyển dụng', labelEn: 'Recruitment', targetId: 'tuyen-dung'},
]

export const headerMenuItem = defineType({
  name: 'headerMenuItem',
  title: 'Mục menu',
  type: 'object',
  fields: [
    defineField({name: 'isVisible', title: 'Hiển thị', type: 'boolean', initialValue: true}),
    defineField({name: 'labelVi', title: 'Tên tiếng Việt', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'labelEn', title: 'Tên tiếng Anh', type: 'string'}),
    colorField('textColor', 'Màu chữ riêng', '#0f172a'),
    defineField({
      name: 'targetId',
      title: 'ID section để cuộn tới',
      type: 'string',
      description: 'Ví dụ: gioi-thieu. Để trống nếu dùng đường dẫn trang.',
    }),
    defineField({
      name: 'path',
      title: 'Đường dẫn trang',
      type: 'string',
      description: 'Ví dụ: /jobs. Đường dẫn được ưu tiên hơn ID section.',
    }),
  ],
  validation: (rule) => rule.custom((value) => value?.path || value?.targetId ? true : 'Nhập đường dẫn trang hoặc ID section.'),
  preview: {
    select: {title: 'labelVi', subtitle: 'path', targetId: 'targetId', isVisible: 'isVisible'},
    prepare: ({title, subtitle, targetId, isVisible}) => ({
      title: title || 'Mục menu',
      subtitle: `${isVisible === false ? 'Đang ẩn · ' : ''}${subtitle || targetId || ''}`,
    }),
  },
})

export const siteHeader = defineType({
  name: 'siteHeader',
  title: 'Cấu hình Header/navbar',
  type: 'document',
  description: 'Quản lý menu toàn website. Nút Đăng nhập/Đăng ký không nằm trong danh sách này.',
  initialValue: {
    title: 'Header chính',
    isEnabled: true,
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    items: defaultItems,
  },
  fields: [
    defineField({
      name: 'title',
      title: 'Tên cấu hình',
      type: 'string',
      initialValue: 'Header chính',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isEnabled',
      title: 'Dùng menu từ Sanity',
      type: 'boolean',
      initialValue: true,
      description: 'Tắt để website quay lại menu mặc định.',
    }),
    colorField('backgroundColor', 'Màu nền thanh header', '#ffffff'),
    colorField('textColor', 'Màu chữ mặc định', '#0f172a'),
    defineField({
      name: 'items',
      title: 'Các mục trong header/navbar',
      type: 'array',
      initialValue: defaultItems,
      description: 'Thêm, xóa, sửa, ẩn/hiện và kéo thả để đổi thứ tự. Không bao gồm nút Đăng nhập/Đăng ký.',
      of: [{type: 'headerMenuItem'}],
    }),
  ],
  preview: {select: {title: 'title'}, prepare: ({title}) => ({title: title || 'Header chính'})},
})
