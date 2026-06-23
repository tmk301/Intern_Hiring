import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

const localized = (name: string, title: string, type: 'string' | 'text' = 'string') => [
  defineField({name, title: `${title} (mặc định)`, type}),
  defineField({name: `${name}Vi`, title: `${title} — Tiếng Việt`, type}),
  defineField({name: `${name}En`, title: `${title} — Tiếng Anh`, type}),
]

const color = (name: string, title: string, initialValue: string) => defineField({
  name, title, type: 'string', initialValue, components: {input: ColorInput},
  validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {name: 'màu HEX'}),
})

const sectionToggle = (name: string, title: string) =>
  defineField({name, title, type: 'boolean', initialValue: true})

const adminCardAppearance = (name: string, title: string) => [
  defineField({name: `${name}CardImage`, title: `Ảnh thẻ ${title}`, type: 'image', options: {hotspot: true}}),
  color(`${name}CardBackgroundColor`, `Màu nền thẻ ${title}`, '#ffffff'),
  color(`${name}CardBorderColor`, `Màu viền thẻ ${title}`, '#e2e8f0'),
  color(`${name}CardTextColor`, `Màu chữ thẻ ${title}`, '#0f172a'),
]

export const jobsPageContent = defineType({
  name: 'jobsPageContent', title: 'Các khối mặc định — Trang việc làm', type: 'object',
  fieldsets: [
    {name: 'hero', title: 'Hero đầu trang'},
    {name: 'filters', title: 'Khối Bộ lọc tìm kiếm'},
    {name: 'results', title: 'Khối Kết quả và card việc làm'},
    {name: 'empty', title: 'Trạng thái không có kết quả'},
  ],
  fields: [
    {...sectionToggle('heroVisible', 'Hiển thị Hero'), fieldset: 'hero'},
    ...localized('title', 'Tiêu đề Hero').map((field) => ({...field, fieldset: 'hero'})),
    ...localized('description', 'Mô tả Hero', 'text').map((field) => ({...field, fieldset: 'hero'})),
    {...color('heroBackgroundColor', 'Màu nền Hero', '#2563eb'), fieldset: 'hero'},
    {...color('heroTextColor', 'Màu chữ Hero', '#ffffff'), fieldset: 'hero'},
    {...sectionToggle('filtersVisible', 'Hiển thị Bộ lọc tìm kiếm'), fieldset: 'filters'},
    ...localized('filterTitle', 'Tiêu đề bộ lọc').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('keywordLabel', 'Nhãn từ khóa').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('keywordPlaceholder', 'Gợi ý ô từ khóa').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('companyLabel', 'Nhãn công ty').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('companyPlaceholder', 'Gợi ý ô công ty').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('workModeLabel', 'Nhãn hình thức làm việc').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('jobTypeLabel', 'Nhãn loại công việc').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('advancedLabel', 'Nhãn tìm kiếm nâng cao').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('cityLabel', 'Nhãn thành phố').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('wardLabel', 'Nhãn phường/xã').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('currencyLabel', 'Nhãn tiền tệ').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('salaryLabel', 'Nhãn mức lương').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('experienceLabel', 'Nhãn kinh nghiệm').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('allLabel', 'Lựa chọn tất cả').map((field) => ({...field, fieldset: 'filters'})),
    ...localized('resetLabel', 'Nút đặt lại bộ lọc').map((field) => ({...field, fieldset: 'filters'})),
    {...color('filterBackgroundColor', 'Màu nền bộ lọc', '#ffffff'), fieldset: 'filters'},
    {...color('filterBorderColor', 'Màu viền bộ lọc', '#e2e8f0'), fieldset: 'filters'},
    {...color('filterTextColor', 'Màu chữ bộ lọc', '#0f172a'), fieldset: 'filters'},
    {...sectionToggle('resultsVisible', 'Hiển thị kết quả và card việc làm'), fieldset: 'results'},
    ...localized('resultsTitle', 'Tiêu đề kết quả').map((field) => ({...field, fieldset: 'results'})),
    ...localized('applicationDeadlineLabel', 'Nhãn hạn nộp hồ sơ').map((field) => ({...field, fieldset: 'results'})),
    ...localized('applyButtonLabel', 'Nút nộp đơn ứng tuyển').map((field) => ({...field, fieldset: 'results'})),
    {...color('contentBackgroundColor', 'Màu nền khu vực kết quả', '#f8fafc'), fieldset: 'results'},
    {...color('jobCardBackgroundColor', 'Màu nền card việc làm', '#ffffff'), fieldset: 'results'},
    {...color('jobCardBorderColor', 'Màu viền card việc làm', '#e2e8f0'), fieldset: 'results'},
    {...color('jobCardTitleColor', 'Màu tiêu đề card', '#0f172a'), fieldset: 'results'},
    {...color('jobCardTextColor', 'Màu nội dung card', '#475569'), fieldset: 'results'},
    {...color('applyButtonBackgroundColor', 'Màu nền nút ứng tuyển', '#2563eb'), fieldset: 'results'},
    {...color('applyButtonTextColor', 'Màu chữ nút ứng tuyển', '#ffffff'), fieldset: 'results'},
    ...localized('emptyTitle', 'Tiêu đề khi không có việc làm').map((field) => ({...field, fieldset: 'empty'})),
    ...localized('emptyDescription', 'Mô tả khi không có việc làm', 'text').map((field) => ({...field, fieldset: 'empty'})),
  ],
})

export const applicationsPageContent = defineType({
  name: 'applicationsPageContent', title: 'Các khối mặc định — Trang ứng tuyển', type: 'object',
  fieldsets: [{name: 'hero', title: 'Hero'}, {name: 'stats', title: 'Thống kê và tab'}, {name: 'empty', title: 'Trạng thái trống'}],
  fields: [
    ...localized('heroBadge', 'Nhãn Hero').map((field) => ({...field, fieldset: 'hero'})),
    ...localized('heroTitle', 'Tiêu đề Hero').map((field) => ({...field, fieldset: 'hero'})),
    ...localized('heroDescription', 'Mô tả Hero', 'text').map((field) => ({...field, fieldset: 'hero'})),
    ...localized('submittedLabel', 'Đã gửi').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('acceptedLabel', 'Đã được duyệt').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('rejectedLabel', 'Bị từ chối').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('favoritesLabel', 'Yêu thích').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('emptySubmittedTitle', 'Thông báo chưa ứng tuyển').map((field) => ({...field, fieldset: 'empty'})),
    ...localized('findJobsButton', 'Nút tìm việc').map((field) => ({...field, fieldset: 'empty'})),
  ],
})

export const verificationPageContent = defineType({
  name: 'verificationPageContent', title: 'Các khối mặc định — Xác thực nhà tuyển dụng', type: 'object',
  fields: [
    ...localized('title', 'Tiêu đề tạo hồ sơ'),
    ...localized('description', 'Mô tả tạo hồ sơ', 'text'),
    ...localized('updateTitle', 'Tiêu đề cập nhật hồ sơ'),
    ...localized('updateDescription', 'Mô tả cập nhật hồ sơ', 'text'),
    ...localized('brandingTitle', 'Khối hình ảnh thương hiệu'),
    ...localized('legalTitle', 'Khối thông tin pháp lý'),
    ...localized('addressesTitle', 'Khối địa chỉ'),
    ...localized('galleryTitle', 'Khối thư viện ảnh'),
  ],
})

export const adminPageContent = defineType({
  name: 'adminPageContent', title: 'Các khối mặc định — Dashboard Admin', type: 'object',
  fieldsets: [{name: 'hero', title: 'Hero'}, {name: 'stats', title: 'Các thẻ quản trị'}, {name: 'panels', title: 'Các bảng nội dung'}],
  fields: [
    {...sectionToggle('heroVisible', 'Hiển thị Hero'), fieldset: 'hero'},
    ...localized('roleLabel', 'Nhãn vai trò').map((field) => ({...field, fieldset: 'hero'})),
    ...localized('title', 'Tiêu đề').map((field) => ({...field, fieldset: 'hero'})),
    ...localized('description', 'Mô tả', 'text').map((field) => ({...field, fieldset: 'hero'})),
    {...sectionToggle('usersCardVisible', 'Hiển thị thẻ Người dùng'), fieldset: 'stats'},
    ...localized('usersTitle', 'Thẻ người dùng').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('usersDescription', 'Mô tả thẻ người dùng').map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('users', 'Người dùng').map((field) => ({...field, fieldset: 'stats'})),
    {...sectionToggle('jobsCardVisible', 'Hiển thị thẻ Tin tuyển dụng'), fieldset: 'stats'},
    ...localized('jobsTitle', 'Thẻ tin tuyển dụng').map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('jobs', 'Tin tuyển dụng').map((field) => ({...field, fieldset: 'stats'})),
    {...sectionToggle('categoriesCardVisible', 'Hiển thị thẻ Danh mục'), fieldset: 'stats'},
    ...localized('categoriesTitle', 'Thẻ danh mục').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('categoriesDescription', 'Mô tả thẻ danh mục').map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('categories', 'Danh mục').map((field) => ({...field, fieldset: 'stats'})),
    {...sectionToggle('auditLogsCardVisible', 'Hiển thị thẻ Audit log'), fieldset: 'stats'},
    ...localized('auditLogsTitle', 'Thẻ audit log').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('auditLogsDescription', 'Mô tả thẻ audit log').map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('auditLogs', 'Audit log').map((field) => ({...field, fieldset: 'stats'})),
    {...sectionToggle('emailFormatCardVisible', 'Hiển thị thẻ Định dạng email'), fieldset: 'stats'},
    ...localized('emailFormatTitle', 'Thẻ định dạng email').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('emailFormatDescription', 'Mô tả thẻ định dạng email').map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('emailFormat', 'Định dạng email').map((field) => ({...field, fieldset: 'stats'})),
    {...sectionToggle('loginBrandingCardVisible', 'Hiển thị thẻ Login/Register'), fieldset: 'stats'},
    ...localized('loginBrandingTitle', 'Thẻ Login/Register').map((field) => ({...field, fieldset: 'stats'})),
    ...localized('loginBrandingDescription', 'Mô tả thẻ Login/Register').map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('loginBranding', 'Login/Register').map((field) => ({...field, fieldset: 'stats'})),
    {...sectionToggle('usersPanelVisible', 'Cho phép hiển thị bảng Người dùng'), fieldset: 'panels'},
    ...localized('usersPanelTitle', 'Bảng người dùng').map((field) => ({...field, fieldset: 'panels'})),
    {...color('usersPanelBackgroundColor', 'Màu nền bảng Người dùng', '#ffffff'), fieldset: 'panels'},
    {...color('usersPanelBorderColor', 'Màu viền bảng Người dùng', '#e2e8f0'), fieldset: 'panels'},
    {...color('usersPanelTextColor', 'Màu chữ bảng Người dùng', '#0f172a'), fieldset: 'panels'},
    {...sectionToggle('jobsPanelVisible', 'Cho phép hiển thị bảng Tin tuyển dụng'), fieldset: 'panels'},
    ...localized('jobsPanelTitle', 'Bảng tin tuyển dụng').map((field) => ({...field, fieldset: 'panels'})),
    {...sectionToggle('categoriesPanelVisible', 'Cho phép hiển thị bảng Danh mục'), fieldset: 'panels'},
    {...sectionToggle('emailPanelVisible', 'Cho phép hiển thị bảng Định dạng email'), fieldset: 'panels'},
    ...localized('emailPanelTitle', 'Bảng định dạng email').map((field) => ({...field, fieldset: 'panels'})),
    {...sectionToggle('auditPanelVisible', 'Cho phép hiển thị bảng Audit log'), fieldset: 'panels'},
    ...localized('auditPanelTitle', 'Bảng audit log').map((field) => ({...field, fieldset: 'panels'})),
  ],
})

export const recruiterPageContent = defineType({
  name: 'recruiterPageContent', title: 'Các khối mặc định — Dashboard nhà tuyển dụng', type: 'object',
  fields: [
    ...localized('title', 'Tiêu đề trang'),
    ...localized('jobStatsTitle', 'Tiêu đề thống kê việc làm'),
    ...localized('totalJobs', 'Tổng tin'),
    ...localized('visibleJobs', 'Tin đang hiển thị'),
    ...localized('hiddenJobs', 'Tin đang ẩn'),
    ...localized('applicantStatsTitle', 'Tiêu đề thống kê ứng viên'),
    ...localized('totalApplicants', 'Tổng ứng viên'),
    ...localized('acceptedApplicants', 'Ứng viên được nhận'),
    ...localized('rejectedApplicants', 'Ứng viên bị từ chối'),
  ],
})

export const moderatorPageContent = defineType({
  name: 'moderatorPageContent', title: 'Các khối mặc định — Dashboard kiểm duyệt', type: 'object',
  fields: [
    ...localized('title', 'Tiêu đề trang'),
    ...localized('description', 'Mô tả trang', 'text'),
    ...localized('jobStatsTitle', 'Tiêu đề thống kê tin'),
    ...localized('companyStatsTitle', 'Tiêu đề thống kê công ty'),
  ],
})
