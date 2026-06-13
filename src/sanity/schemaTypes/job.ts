import { defineField, defineType } from 'sanity'

export const jobType = defineType({
  name: 'job',
  title: 'Tin tuyển dụng',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tiêu đề công việc',
      type: 'string',
    }),
    defineField({
      name: 'company',
      title: 'Tên công ty',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Mô tả chi tiết',
      type: 'text',
    }),
  ],
})