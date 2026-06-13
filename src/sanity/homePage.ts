import { defineField, defineType } from 'sanity'

export const homePageType = defineType({
  name: 'homePage',
  title: 'Nội dung Trang Chủ',
  type: 'document',

  groups: [
    { name: 'hero', title: 'Cấu hình Hero Banner' },
    { name: 'about', title: 'Cấu hình Phần Giới thiệu' },
  ],
  fields: [
    // --- PHẦN HERO ---
    defineField({
      name: 'heroTitle',
      title: 'Tiêu đề chính (Brand Name)',
      type: 'string',
      group: 'hero',
    }),
    defineField({
      name: 'heroSubtitle',
      title: 'Dòng phụ đề (Subtitle)',
      type: 'string',
      group: 'hero',
    }),
    // BỔ SUNG THÊM MÔ TẢ HERO
    defineField({
      name: 'heroDescription',
      title: 'Đoạn mô tả ngắn (Hero Description)',
      type: 'text',
      group: 'hero',
    }),
    defineField({
      name: 'heroBgImage',
      title: 'Ảnh nền Hero',
      type: 'image',
      options: { hotspot: true },
      group: 'hero',
    }),
    
    // --- PHẦN ABOUT ---
    defineField({
      name: 'aboutTitle',
      title: 'Tiêu đề phần Giới thiệu',
      type: 'string',
      group: 'about',
    }),
    // BỔ SUNG MẢNG CÁC TÍNH NĂNG ĐỂ FRONTEND LẶP VÒNG MẶP (MAP)
    defineField({
      name: 'aboutFeatures',
      title: 'Các khối tính năng (Thêm/Bớt linh hoạt)',
      type: 'array',
      group: 'about',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', title: 'Tiêu đề khối', type: 'string' },
            { name: 'description', title: 'Mô tả chi tiết', type: 'text' },
            { 
              name: 'icon', 
              title: 'Tên Icon (VD: Briefcase, Users, CheckCircle)', 
              type: 'string' 
            }
          ]
        }
      ]
    }),
  ],
})