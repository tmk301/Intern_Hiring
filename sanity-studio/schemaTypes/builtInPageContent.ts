import {defineField, defineType} from 'sanity'
import {ColorInput} from './ColorInput'

const localized = (
  name: string,
  title: string,
  type: 'string' | 'text' = 'string',
  placeholders?: {default?: string; vi?: string; en?: string}
) => [
  defineField({
    name,
    title: `${title} (Default)`,
    type,
    placeholder: placeholders?.default,
  }),
  defineField({
    name: `${name}Vi`,
    title: `${title} VI`,
    type,
    placeholder: placeholders?.vi,
  }),
  defineField({
    name: `${name}En`,
    title: `${title} EN`,
    type,
    placeholder: placeholders?.en,
  }),
]

const color = (name: string, title: string, initialValue: string) => defineField({
  name,
  title,
  type: 'string',
  initialValue,
  components: {input: ColorInput},
  validation: (rule) => rule.regex(/^#[0-9a-fA-F]{6}$/, {name: 'HEX color'}),
})

const sectionToggle = (name: string, title: string) =>
  defineField({name, title, type: 'boolean', initialValue: true})

const adminCardAppearance = (name: string, title: string) => [
  defineField({name: `${name}CardImage`, title: `${title} Card Image`, type: 'image', options: {hotspot: true}}),
  color(`${name}CardBackgroundColor`, `${title} Card Background Color`, '#ffffff'),
  color(`${name}CardBorderColor`, `${title} Card Border Color`, '#e2e8f0'),
  color(`${name}CardTextColor`, `${title} Card Text Color`, '#0f172a'),
]

export const jobsPageContent = defineType({
  name: 'jobsPageContent',
  title: 'Default Content — Jobs Page',
  type: 'object',
  fieldsets: [
    {name: 'hero', title: 'Top Hero Section'},
    {name: 'filters', title: 'Search Filters Section'},
    {name: 'results', title: 'Search Results & Job Cards Section'},
    {name: 'empty', title: 'No Results Empty State'},
  ],
  fields: [
    {...sectionToggle('heroVisible', 'Show Hero'), fieldset: 'hero'},
    ...localized('title', 'Hero Title', 'string', {
      default: 'Việc làm thực tập',
      vi: 'Việc làm thực tập',
      en: 'Internship Jobs'
    }).map((field) => ({...field, fieldset: 'hero'})),
    ...localized('description', 'Hero Description', 'text', {
      default: 'Tìm kiếm và ứng tuyển các vị trí thực tập phù hợp.',
      vi: 'Tìm kiếm và ứng tuyển các vị trí thực tập phù hợp.',
      en: 'Search and apply for suitable internship positions.'
    }).map((field) => ({...field, fieldset: 'hero'})),
    {...color('heroBackgroundColor', 'Hero Background Color', '#2563eb'), fieldset: 'hero'},
    {...color('heroTextColor', 'Hero Text Color', '#ffffff'), fieldset: 'hero'},

    {...sectionToggle('filtersVisible', 'Show Search Filters'), fieldset: 'filters'},
    ...localized('filterTitle', 'Filters Section Title', 'string', {
      default: 'Bộ lọc tìm kiếm',
      vi: 'Bộ lọc tìm kiếm',
      en: 'Search Filter'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('keywordLabel', 'Keyword Label', 'string', {
      default: 'Từ khóa',
      vi: 'Từ khóa',
      en: 'Keyword'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('keywordPlaceholder', 'Keyword Input Placeholder', 'string', {
      default: 'Tìm tên công việc, kỹ năng...',
      vi: 'Tìm tên công việc, kỹ năng...',
      en: 'Search job title, skills...'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('companyLabel', 'Company Label', 'string', {
      default: 'Công ty',
      vi: 'Công ty',
      en: 'Company'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('companyPlaceholder', 'Company Input Placeholder', 'string', {
      default: 'Tất cả công ty',
      vi: 'Tất cả công ty',
      en: 'All companies'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('workModeLabel', 'Work Mode Label', 'string', {
      default: 'Hình thức',
      vi: 'Hình thức làm việc',
      en: 'Work mode'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('jobTypeLabel', 'Job Type Label', 'string', {
      default: 'Loại công việc',
      vi: 'Loại công việc',
      en: 'Job type'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('advancedLabel', 'Advanced Settings Label', 'string', {
      default: 'Nâng cao',
      vi: 'Tìm kiếm nâng cao',
      en: 'Advanced search'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('cityLabel', 'City Label', 'string', {
      default: 'Thành phố',
      vi: 'Thành phố',
      en: 'City'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('wardLabel', 'Ward Label', 'string', {
      default: 'Phường/Xã',
      vi: 'Phường/Xã',
      en: 'Ward'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('currencyLabel', 'Currency Label', 'string', {
      default: 'Tiền tệ',
      vi: 'Tiền tệ',
      en: 'Currency'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('salaryLabel', 'Salary Label', 'string', {
      default: 'Mức lương',
      vi: 'Mức lương',
      en: 'Salary'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('experienceLabel', 'Experience Label', 'string', {
      default: 'Kinh nghiệm',
      vi: 'Kinh nghiệm',
      en: 'Experience'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('allLabel', 'Select All Option Label', 'string', {
      default: 'Tất cả',
      vi: 'Tất cả',
      en: 'All'
    }).map((field) => ({...field, fieldset: 'filters'})),
    ...localized('resetLabel', 'Reset Filters Button Label', 'string', {
      default: 'Đặt lại',
      vi: 'Đặt lại',
      en: 'Reset'
    }).map((field) => ({...field, fieldset: 'filters'})),
    {...color('filterBackgroundColor', 'Filter Section Background Color', '#ffffff'), fieldset: 'filters'},
    {...color('filterBorderColor', 'Filter Section Border Color', '#e2e8f0'), fieldset: 'filters'},
    {...color('filterTextColor', 'Filter Section Text Color', '#0f172a'), fieldset: 'filters'},

    {...sectionToggle('resultsVisible', 'Show Results & Cards'), fieldset: 'results'},
    ...localized('resultsTitle', 'Search Results Title', 'string', {
      default: 'Kết quả tìm kiếm',
      vi: 'Kết quả tìm kiếm',
      en: 'Search results'
    }).map((field) => ({...field, fieldset: 'results'})),
    ...localized('applicationDeadlineLabel', 'Application Deadline Label', 'string', {
      default: 'Hạn nộp hồ sơ',
      vi: 'Hạn nộp hồ sơ',
      en: 'Application deadline'
    }).map((field) => ({...field, fieldset: 'results'})),
    ...localized('applyButtonLabel', 'Apply Now Button Label', 'string', {
      default: 'Ứng tuyển',
      vi: 'Nộp đơn ứng tuyển',
      en: 'Apply now'
    }).map((field) => ({...field, fieldset: 'results'})),
    {...color('contentBackgroundColor', 'Results Area Background Color', '#f8fafc'), fieldset: 'results'},
    {...color('jobCardBackgroundColor', 'Job Card Background Color', '#ffffff'), fieldset: 'results'},
    {...color('jobCardBorderColor', 'Job Card Border Color', '#e2e8f0'), fieldset: 'results'},
    {...color('jobCardTitleColor', 'Job Card Title Color', '#0f172a'), fieldset: 'results'},
    {...color('jobCardTextColor', 'Job Card Content Text Color', '#475569'), fieldset: 'results'},
    {...color('applyButtonBackgroundColor', 'Apply Button Background Color', '#2563eb'), fieldset: 'results'},
    {...color('applyButtonTextColor', 'Apply Button Text Color', '#ffffff'), fieldset: 'results'},

    ...localized('emptyTitle', 'Empty Results Title', 'string', {
      default: 'Không tìm thấy công việc',
      vi: 'Không tìm thấy công việc',
      en: 'No jobs found'
    }).map((field) => ({...field, fieldset: 'empty'})),
    ...localized('emptyDescription', 'Empty Results Description', 'text', {
      default: 'Thử thay đổi bộ lọc hoặc quay lại sau.',
      vi: 'Thử thay đổi bộ lọc hoặc quay lại sau.',
      en: 'Try changing the filters or come back later.'
    }).map((field) => ({...field, fieldset: 'empty'})),
  ],
})

export const applicationsPageContent = defineType({
  name: 'applicationsPageContent',
  title: 'Default Content — Applications Page',
  type: 'object',
  fieldsets: [
    {name: 'hero', title: 'Hero Section'},
    {name: 'stats', title: 'Stats & Tabs Section'},
    {name: 'empty', title: 'Empty States Section'},
    {name: 'style', title: 'Colors & Style'},
  ],
  fields: [
    ...localized('heroBadge', 'Hero Badge Text', 'string', {
      default: 'Career dossier',
      vi: 'Hồ sơ nghề nghiệp',
      en: 'Career dossier'
    }).map((field) => ({...field, fieldset: 'hero'})),
    ...localized('heroTitle', 'Hero Title', 'string', {
      default: 'Ứng tuyển',
      vi: 'Ứng tuyển',
      en: 'Applications'
    }).map((field) => ({...field, fieldset: 'hero'})),
    ...localized('heroDescription', 'Hero Description', 'text', {
      default: 'Theo dõi toàn bộ hồ sơ đã gửi và những vị trí đã được công ty duyệt.',
      vi: 'Theo dõi toàn bộ hồ sơ đã gửi và những vị trí đã được công ty duyệt.',
      en: 'Track all submitted profiles and applications approved by partner companies.'
    }).map((field) => ({...field, fieldset: 'hero'})),

    ...localized('submittedLabel', 'Submitted Tab Label', 'string', {
      default: 'Đã gửi',
      vi: 'Đã gửi',
      en: 'Submitted'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...localized('acceptedLabel', 'Approved Tab Label', 'string', {
      default: 'Đã được duyệt',
      vi: 'Đã được duyệt',
      en: 'Approved'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...localized('rejectedLabel', 'Rejected Tab Label', 'string', {
      default: 'Bị từ chối',
      vi: 'Bị từ chối',
      en: 'Rejected'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...localized('favoritesLabel', 'Favorites Tab Label', 'string', {
      default: 'Yêu thích',
      vi: 'Yêu thích',
      en: 'Favorites'
    }).map((field) => ({...field, fieldset: 'stats'})),

    ...localized('emptySubmittedTitle', 'No Submitted Applications Title', 'string', {
      default: 'Bạn chưa gửi hồ sơ nào',
      vi: 'Bạn chưa gửi hồ sơ nào',
      en: 'You have not submitted any applications yet'
    }).map((field) => ({...field, fieldset: 'empty'})),
    ...localized('findJobsButton', 'Find Jobs Redirect Button Label', 'string', {
      default: 'Tìm việc ngay',
      vi: 'Tìm việc ngay',
      en: 'Find jobs now'
    }).map((field) => ({...field, fieldset: 'empty'})),

    {...color('backgroundColor', 'Background Color', '#f8fafc'), fieldset: 'style'},
    {...color('textColor', 'Text Color', '#0f172a'), fieldset: 'style'},
  ],
})

export const verificationPageContent = defineType({
  name: 'verificationPageContent',
  title: 'Default Content — Recruiter Verification Page',
  type: 'object',
  fieldsets: [
    {name: 'content', title: 'Content Fields'},
    {name: 'style', title: 'Colors & Style'},
  ],
  fields: [
    ...localized('title', 'Create Profile Title', 'string', {
      default: 'Xác thực nhà tuyển dụng',
      vi: 'Xác thực nhà tuyển dụng',
      en: 'Recruiter Verification'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('description', 'Create Profile Description', 'text', {
      default: 'Hoàn tất hồ sơ công ty và gửi cho admin duyệt trước khi trở thành nhà tuyển dụng.',
      vi: 'Hoàn tất hồ sơ công ty và gửi cho admin duyệt trước khi trở thành nhà tuyển dụng.',
      en: 'Complete the company profile and submit for admin approval before recruiting.'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('updateTitle', 'Edit Profile Title', 'string', {
      default: 'Chỉnh sửa hồ sơ công ty',
      vi: 'Chỉnh sửa hồ sơ công ty',
      en: 'Edit Company Profile'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('updateDescription', 'Edit Profile Description', 'text', {
      default: 'Gửi thông tin cập nhật cho admin duyệt.',
      vi: 'Gửi thông tin cập nhật cho admin duyệt.',
      en: 'Submit updated information for admin review.'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('brandingTitle', 'Branding Section Header', 'string', {
      default: 'Hình ảnh thương hiệu',
      vi: 'Hình ảnh thương hiệu',
      en: 'Company Branding'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('legalTitle', 'Legal Info Section Header', 'string', {
      default: 'Thông tin pháp lý',
      vi: 'Thông tin pháp lý',
      en: 'Legal Information'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('addressesTitle', 'Addresses Section Header', 'string', {
      default: 'Địa chỉ',
      vi: 'Địa chỉ',
      en: 'Office Addresses'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('galleryTitle', 'Gallery Section Header', 'string', {
      default: 'Thư viện ảnh',
      vi: 'Thư viện ảnh',
      en: 'Photo Gallery'
    }).map((field) => ({...field, fieldset: 'content'})),

    {...color('backgroundColor', 'Background Color', '#f8fafc'), fieldset: 'style'},
    {...color('textColor', 'Text Color', '#0f172a'), fieldset: 'style'},
  ],
})

export const adminPageContent = defineType({
  name: 'adminPageContent',
  title: 'Default Content — Admin Dashboard',
  type: 'object',
  fieldsets: [
    {name: 'hero', title: 'Hero Section'},
    {name: 'stats', title: 'Management Cards Section'},
    {name: 'panels', title: 'Content Data Tables Section'},
  ],
  fields: [
    {...sectionToggle('heroVisible', 'Show Hero Banner'), fieldset: 'hero'},
    ...localized('roleLabel', 'Role Badge Label', 'string', {
      default: 'Quản trị',
      vi: 'Quản trị',
      en: 'Administration'
    }).map((field) => ({...field, fieldset: 'hero'})),
    ...localized('title', 'Dashboard Title', 'string', {
      default: 'Trang quản trị viên',
      vi: 'Trang quản trị viên',
      en: 'Administrator Dashboard'
    }).map((field) => ({...field, fieldset: 'hero'})),
    ...localized('description', 'Dashboard Description', 'text', {
      default: 'Quản lý tài khoản, tin tuyển dụng và yêu cầu xác thực nhà tuyển dụng.',
      vi: 'Quản lý tài khoản, tin tuyển dụng và yêu cầu xác thực nhà tuyển dụng.',
      en: 'Manage accounts, job posts, and recruiter verification requests.'
    }).map((field) => ({...field, fieldset: 'hero'})),

    {...sectionToggle('usersCardVisible', 'Show Users Card'), fieldset: 'stats'},
    ...localized('usersTitle', 'Users Card Title', 'string', {
      default: 'Tất cả người dùng',
      vi: 'Tất cả người dùng',
      en: 'All Users'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...localized('usersDescription', 'Users Card Description', 'string', {
      default: 'Bấm để xem danh sách tài khoản',
      vi: 'Bấm để xem danh sách tài khoản',
      en: 'Click to view account list'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('users', 'Users').map((field) => ({...field, fieldset: 'stats'})),

    {...sectionToggle('jobsCardVisible', 'Show Jobs Card'), fieldset: 'stats'},
    ...localized('jobsTitle', 'Jobs Card Title', 'string', {
      default: 'Tin tuyển dụng',
      vi: 'Tin tuyển dụng',
      en: 'Job Posts'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('jobs', 'Jobs').map((field) => ({...field, fieldset: 'stats'})),

    {...sectionToggle('auditLogsCardVisible', 'Show Audit Logs Card'), fieldset: 'stats'},
    ...localized('auditLogsTitle', 'Audit Logs Card Title', 'string', {
      default: 'Audit log',
      vi: 'Nhật ký chỉnh sửa',
      en: 'Audit logs'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...localized('auditLogsDescription', 'Audit Logs Card Description', 'string', {
      default: 'Theo dõi thao tác admin',
      vi: 'Theo dõi thao tác admin',
      en: 'Track admin activities'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('auditLogs', 'Audit Logs').map((field) => ({...field, fieldset: 'stats'})),

    {...sectionToggle('emailFormatCardVisible', 'Show Email Format Card'), fieldset: 'stats'},
    ...localized('emailFormatTitle', 'Email Format Card Title', 'string', {
      default: 'Email format',
      vi: 'Định dạng email',
      en: 'Email template formatting'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...localized('emailFormatDescription', 'Email Format Card Description', 'string', {
      default: 'Colors, font size, header image',
      vi: 'Màu sắc, cỡ chữ, ảnh tiêu đề',
      en: 'Colors, font size, header image'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('emailFormat', 'Email Format').map((field) => ({...field, fieldset: 'stats'})),

    {...sectionToggle('loginBrandingCardVisible', 'Show Sanity Card'), fieldset: 'stats'},
    ...localized('loginBrandingTitle', 'Sanity Card Title', 'string', {
      default: 'Sanity',
      vi: 'Sanity',
      en: 'Sanity'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...localized('loginBrandingDescription', 'Sanity Card Description', 'string', {
      default: 'Mở Sanity Studio để quản lý nội dung trang và văn bản giao diện',
      vi: 'Mở Sanity Studio để quản lý nội dung trang và văn bản giao diện',
      en: 'Open Sanity Studio to manage page content and interface text'
    }).map((field) => ({...field, fieldset: 'stats'})),
    ...adminCardAppearance('loginBranding', 'Sanity').map((field) => ({...field, fieldset: 'stats'})),

    {...sectionToggle('usersPanelVisible', 'Show Users Panel List'), fieldset: 'panels'},
    ...localized('usersPanelTitle', 'Users Panel Title', 'string', {
      default: 'Danh sách tài khoản người dùng',
      vi: 'Danh sách tài khoản người dùng',
      en: 'User account list'
    }).map((field) => ({...field, fieldset: 'panels'})),
    {...color('usersPanelBackgroundColor', 'Users Panel Background Color', '#ffffff'), fieldset: 'panels'},
    {...color('usersPanelBorderColor', 'Users Panel Border Color', '#e2e8f0'), fieldset: 'panels'},
    {...color('usersPanelTextColor', 'Users Panel Text Color', '#0f172a'), fieldset: 'panels'},

    {...sectionToggle('jobsPanelVisible', 'Show Jobs Panel List'), fieldset: 'panels'},
    ...localized('jobsPanelTitle', 'Jobs Panel Title', 'string', {
      default: 'Tin tuyển dụng',
      vi: 'Tin tuyển dụng',
      en: 'Job posts'
    }).map((field) => ({...field, fieldset: 'panels'})),

    {...sectionToggle('emailPanelVisible', 'Show Email Format Panel List'), fieldset: 'panels'},
    ...localized('emailPanelTitle', 'Email Panel Title', 'string', {
      default: 'Email format',
      vi: 'Định dạng email',
      en: 'Email format'
    }).map((field) => ({...field, fieldset: 'panels'})),

    {...sectionToggle('auditPanelVisible', 'Show Audit Logs Panel List'), fieldset: 'panels'},
    ...localized('auditPanelTitle', 'Audit Panel Title', 'string', {
      default: 'Audit log',
      vi: 'Nhật ký hệ thống',
      en: 'System audit logs'
    }).map((field) => ({...field, fieldset: 'panels'})),
  ],
})

export const recruiterPageContent = defineType({
  name: 'recruiterPageContent',
  title: 'Default Content — Recruiter Dashboard',
  type: 'object',
  fieldsets: [
    {name: 'content', title: 'Content Fields'},
    {name: 'style', title: 'Colors & Style'},
  ],
  fields: [
    ...localized('title', 'Page Title', 'string', {
      default: 'Dashboard nhà tuyển dụng',
      vi: 'Dashboard nhà tuyển dụng',
      en: 'Recruiter Dashboard'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('jobStatsTitle', 'Job Statistics Box Title', 'string', {
      default: 'Thống kê tin tuyển dụng',
      vi: 'Thống kê tin tuyển dụng',
      en: 'Job Post Statistics'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('totalJobs', 'Total Jobs Text', 'string', {
      default: 'Tổng tin',
      vi: 'Tổng tin',
      en: 'Total job posts'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('visibleJobs', 'Visible Jobs Text', 'string', {
      default: 'Tin đang hiển thị',
      vi: 'Tin đang hiển thị',
      en: 'Visible job posts'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('hiddenJobs', 'Hidden Jobs Text', 'string', {
      default: 'Tin đang ẩn',
      vi: 'Tin đang ẩn',
      en: 'Hidden job posts'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('applicantStatsTitle', 'Applicant Statistics Box Title', 'string', {
      default: 'Thống kê ứng viên',
      vi: 'Thống kê ứng viên',
      en: 'Applicant Statistics'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('totalApplicants', 'Total Applicants Text', 'string', {
      default: 'Tổng ứng viên',
      vi: 'Tổng ứng viên',
      en: 'Total applicants'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('acceptedApplicants', 'Approved Applicants Text', 'string', {
      default: 'Ứng viên được nhận',
      vi: 'Ứng viên được nhận',
      en: 'Approved applicants'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('rejectedApplicants', 'Rejected Applicants Text', 'string', {
      default: 'Ứng viên bị từ chối',
      vi: 'Ứng viên bị từ chối',
      en: 'Rejected applicants'
    }).map((field) => ({...field, fieldset: 'content'})),

    {...color('backgroundColor', 'Background Color', '#f8fafc'), fieldset: 'style'},
    {...color('textColor', 'Text Color', '#0f172a'), fieldset: 'style'},
  ],
})

export const moderatorPageContent = defineType({
  name: 'moderatorPageContent',
  title: 'Default Content — Moderator Dashboard',
  type: 'object',
  fieldsets: [
    {name: 'content', title: 'Content Fields'},
    {name: 'style', title: 'Colors & Style'},
  ],
  fields: [
    ...localized('title', 'Page Title', 'string', {
      default: 'Dashboard kiểm duyệt',
      vi: 'Dashboard kiểm duyệt',
      en: 'Moderator Dashboard'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('description', 'Page Description', 'text', {
      default: 'Phê duyệt các tin tuyển dụng và yêu cầu xác thực nhà tuyển dụng.',
      vi: 'Phê duyệt các tin tuyển dụng và yêu cầu xác thực nhà tuyển dụng.',
      en: 'Approve job posts and recruiter verification requests.'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('jobStatsTitle', 'Job Posts Section Title', 'string', {
      default: 'Kiểm duyệt tin tuyển dụng',
      vi: 'Kiểm duyệt tin tuyển dụng',
      en: 'Review Job Posts'
    }).map((field) => ({...field, fieldset: 'content'})),
    ...localized('companyStatsTitle', 'Recruiters Section Title', 'string', {
      default: 'Kiểm duyệt nhà tuyển dụng',
      vi: 'Kiểm duyệt nhà tuyển dụng',
      en: 'Review Recruiters'
    }).map((field) => ({...field, fieldset: 'content'})),

    {...color('backgroundColor', 'Background Color', '#f8fafc'), fieldset: 'style'},
    {...color('textColor', 'Text Color', '#0f172a'), fieldset: 'style'},
  ],
})
