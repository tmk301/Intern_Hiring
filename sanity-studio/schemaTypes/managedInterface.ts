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
    title: `${title} (mặc định)`,
    type,
    ...(rows ? {rows} : {}),
  }),
  defineField({
    name: `${name}Vi`,
    title: `${title} tiếng Việt`,
    type,
    ...(rows ? {rows} : {}),
  }),
  defineField({
    name: `${name}En`,
    title: `${title} tiếng Anh`,
    type,
    ...(rows ? {rows} : {}),
  }),
]

export const managedInterfaceText = defineType({
  name: 'managedInterfaceText',
  title: 'Nội dung giao diện',
  type: 'object',
  fields: [
    defineField({
      name: 'key',
      title: 'Mã nội dung',
      type: 'string',
      description: 'Mã cố định phía frontend, ví dụ: home.heroSubtitle.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Tên gợi nhớ',
      type: 'string',
      description: 'Tên dễ đọc để admin biết nội dung này dùng cho phần nào.',
    }),
    defineField({
      name: 'isVisible',
      title: 'Hiển thị',
      type: 'boolean',
      initialValue: true,
      description: 'Tắt mục này để ẩn nội dung tương ứng ngoài frontend.',
    }),
    defineField({
      name: 'value',
      title: 'Nội dung mặc định',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'valueVi',
      title: 'Nội dung tiếng Việt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'valueEn',
      title: 'Nội dung tiếng Anh',
      type: 'text',
      rows: 3,
    }),
    colorField('textColor', 'Màu chữ', '#0f172a'),
    colorField('backgroundColor', 'Màu nền ô', '#ffffff'),
    colorField('borderColor', 'Màu viền ô', '#e2e8f0'),
    defineField({
      name: 'image',
      title: 'Hình ảnh',
      type: 'image',
      options: {hotspot: true},
      description: 'Hình ảnh tuỳ chọn đi kèm nội dung. Frontend sẽ hiển thị ở những vị trí có hỗ trợ.',
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
  title: 'Quản lý giao diện có sẵn',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tên trang',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'routePath',
      title: 'Đường dẫn trang',
      type: 'string',
      description: 'Đường dẫn frontend có nội dung giao diện mặc định được quản lý tại đây. Login và Register có document riêng.',
      initialValue: '/',
      options: {
        list: [
          {title: 'Trang chủ', value: '/'},
          {title: 'Việc làm', value: '/jobs'},
          {title: 'Hồ sơ cá nhân', value: '/profile'},
          {title: 'Ứng tuyển', value: '/applications'},
          {title: 'Xác thực nhà tuyển dụng', value: '/recruiter-verification'},
          {title: 'Dashboard nhà tuyển dụng', value: '/recruiter'},
          {title: 'Dashboard admin', value: '/admin'},
          {title: 'Dashboard kiểm duyệt', value: '/moderator'},
        ],
      },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value === '/login' || value === '/register'
              ? 'Login và Register được quản lý bằng document Sanity riêng.'
              : true,
          ),
    }),
    defineField({
      name: 'texts',
      title: 'Danh sách nội dung',
      type: 'array',
      of: [{type: 'managedInterfaceText'}],
    }),
    defineField({
      name: 'theme',
      title: 'Giao diện màu sắc',
      type: 'object',
      fields: [
        colorField('pageBackgroundColor', 'Màu nền trang', '#f8fafc'),
        colorField('headerBackgroundColor', 'Màu nền phần đầu trang', '#ffffff'),
        colorField('headerTextColor', 'Màu chữ phần đầu trang', '#0f172a'),
        colorField('bodyTextColor', 'Màu chữ nội dung', '#0f172a'),
        colorField('mutedTextColor', 'Màu chữ phụ', '#64748b'),
        colorField('cardBackgroundColor', 'Màu nền thẻ', '#ffffff'),
        colorField('cardBorderColor', 'Màu viền thẻ', '#e2e8f0'),
        colorField('accentColor', 'Màu nhấn', '#2563eb'),
      ],
    }),
    defineField({
      name: 'images',
      title: 'Hình ảnh',
      type: 'object',
      fields: [
        defineField({
          name: 'headerImage',
          title: 'Hình đầu trang',
          type: 'image',
          options: {hotspot: true},
        }),
      ],
    }),
    defineField({
      name: 'navbar',
      title: 'Thanh điều hướng',
      type: 'object',
      description: 'Cấu hình thanh điều hướng toàn cục. Nên chỉnh trong document giao diện Trang chủ.',
      fields: [
        defineField({
          name: 'isEnabled',
          title: 'Dùng thanh điều hướng tuỳ chỉnh',
          type: 'boolean',
          initialValue: false,
        }),
        ...localizedTextFields('brandName', 'Tên thương hiệu'),
        defineField({
          name: 'logo',
          title: 'Logo',
          type: 'image',
          options: {hotspot: true},
        }),
        defineField({
          name: 'showTopBar',
          title: 'Hiển thị thanh thông báo trên cùng',
          type: 'boolean',
          initialValue: false,
        }),
        ...localizedTextFields('topBarText', 'Nội dung thanh thông báo'),
        colorField('topBarBackgroundColor', 'Màu nền thanh thông báo', '#0b3f8a'),
        colorField('topBarTextColor', 'Màu chữ thanh thông báo', '#ffffff'),
        colorField('backgroundColor', 'Màu nền thanh điều hướng', '#ffffff'),
        colorField('textColor', 'Màu chữ thanh điều hướng', '#0f172a'),
        colorField('accentColor', 'Màu nhấn', '#2563eb'),
        colorField('buttonBackgroundColor', 'Màu nút đăng nhập', '#2563eb'),
        colorField('buttonTextColor', 'Màu chữ nút đăng nhập', '#ffffff'),
        defineField({
          name: 'items',
          title: 'Các mục điều hướng',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                defineField({
                  name: 'isVisible',
                  title: 'Hiển thị',
                  type: 'boolean',
                  initialValue: true,
                }),
                ...localizedTextFields('label', 'Tên mục'),
                defineField({
                  name: 'targetId',
                  title: 'ID section để cuộn tới',
                  type: 'string',
                  description: 'Dùng cho link cuộn trong trang chủ, ví dụ: gioi-thieu.',
                }),
                defineField({
                  name: 'path',
                  title: 'Đường dẫn trang',
                  type: 'string',
                  description: 'Tuỳ chọn. Ví dụ /jobs, /profile. Nếu nhập mục này thì sẽ ưu tiên hơn ID section.',
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
