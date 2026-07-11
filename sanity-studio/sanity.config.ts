import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

const textItem = (
  key: string,
  label: string,
  value: string,
  valueVi?: string,
  valueEn?: string,
) => ({
  _type: 'managedInterfaceText',
  key,
  label,
  value,
  ...(valueVi ? {valueVi} : {}),
  ...(valueEn ? {valueEn} : {}),
})

const sectionSlug = (current: string) => ({_type: 'slug', current})

const defaultTextSection = (
  key: string,
  placement: 'top' | 'afterHero' | 'bottom',
  title: string,
  body: string,
) => ({
  _type: 'pageTextSection',
  _key: key,
  isVisible: true,
  placement,
  anchorId: sectionSlug(key),
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  animation: 'fadeUp',
  animationDelay: 0,
  title,
  titleVi: title,
  body,
  bodyVi: body,
  align: 'center',
})

const defaultCtaSection = (
  key: string,
  placement: 'top' | 'afterHero' | 'bottom',
  title: string,
  description: string,
  label: string,
  href: string,
) => ({
  _type: 'pageCtaSection',
  _key: key,
  isVisible: true,
  placement,
  anchorId: sectionSlug(key),
  backgroundColor: '#f8fafc',
  textColor: '#0f172a',
  animation: 'fadeUp',
  animationDelay: 0,
  title,
  titleVi: title,
  description,
  descriptionVi: description,
  button: {
    _type: 'pageCtaButton',
    label,
    labelVi: label,
    href,
    style: 'primary',
  },
})

const defaultSpacerSection = (key: string, placement: 'top' | 'afterHero' | 'bottom', height = 32) => ({
  _type: 'pageSpacerSection',
  _key: key,
  isVisible: true,
  placement,
  anchorId: sectionSlug(key),
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
  animation: 'none',
  animationDelay: 0,
  height,
})

const managedPageTemplate = (
  id: string,
  title: string,
  routePath: string,
  _sections: Array<Record<string, unknown>>,
  texts: Array<ReturnType<typeof textItem>> = [],
  theme = {},
  extraValue: Record<string, unknown> = {},
) => ({
  id,
  title,
  schemaType: 'managedPage',
  value: {
    title,
    routePath,
    texts,
    sections: [],
    theme,
    ...extraValue,
  },
})

const adminTheme = {
  pageBackgroundColor: '#f8fafc',
  headerBackgroundColor: '#ffffff',
  headerTextColor: '#0f172a',
  bodyTextColor: '#0f172a',
  mutedTextColor: '#64748b',
  cardBackgroundColor: '#ffffff',
  cardBorderColor: '#e2e8f0',
  accentColor: '#2563eb',
}

export default defineConfig({
  name: 'intern_hiring_studio',
  title: 'Intern Hiring',
  projectId: '41cnp8ig',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) => {
        const managedPageItem = (id: string, title: string, routePath: string, templateId: string) =>
          S.listItem()
            .id(id)
            .title(title)
            .child(
              S.documentList()
                .id(`${id}-documents`)
                .title(title)
                .schemaType('managedPage')
                .filter('_type == "managedPage" && routePath == $routePath')
                .params({routePath})
                .initialValueTemplates([S.initialValueTemplateItem(templateId)]),
            )

        return S.list()
          .title('Intern Hiring')
          .items([
            S.listItem()
              .id('site-header')
              .title('Header/Navbar')
              .child(
                S.documentList()
                  .id('site-header-list')
                  .title('Header/Navbar Configuration')
                  .schemaType('siteHeader')
                  .filter('_type == "siteHeader"')
                  .initialValueTemplates([S.initialValueTemplateItem('site-header-template')])
              ),
            S.divider(),
            managedPageItem('page-home', 'Home Page', '/', 'managed-page-home'),
            managedPageItem('page-jobs', 'Jobs Page', '/jobs', 'managed-page-jobs'),
            managedPageItem('page-job-detail', 'Job Detail Page', '/jobs/:jobId', 'managed-page-job-detail'),
            managedPageItem('page-applications', 'Applications Page', '/applications', 'managed-page-applications'),
            managedPageItem('page-profile', 'Profile Page', '/profile', 'managed-page-profile'),
            managedPageItem(
              'page-recruiter-verification',
              'Recruiter Verification Page',
              '/recruiter-verification',
              'managed-page-recruiter-verification',
            ),
            managedPageItem('page-company-profile', 'Company Profile Page', '/companies/:companyId', 'managed-page-company-profile'),
            managedPageItem('page-reset-password', 'Reset Password Page', '/reset-password', 'managed-page-reset-password'),
            managedPageItem('page-admin', 'Admin Dashboard', '/admin', 'managed-page-admin'),
            managedPageItem('page-admin-user-profile', 'Admin User Profile Page', '/admin/users/:userId', 'managed-page-admin-user-profile'),
            managedPageItem('page-admin-company-review', 'Admin Company Review Page', '/admin/company-reviews/:applicationId', 'managed-page-admin-company-review'),
            managedPageItem('page-recruiter', 'Recruiter Dashboard', '/recruiter', 'managed-page-recruiter'),
            managedPageItem('page-moderator', 'Moderator Dashboard', '/moderator', 'managed-page-moderator'),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => item.getId() !== 'siteHeader' && item.getId() !== 'managedPage',
            ),
          ])
      },
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev.filter((template) => template.schemaType !== 'siteHeader'),
      {
        id: 'site-header-template',
        title: 'Header/Navbar Template',
        schemaType: 'siteHeader',
        value: {
          title: 'Primary Header',
          isEnabled: true,
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          items: [
            {_type: 'headerMenuItem', _key: 'about', isVisible: true, labelVi: 'Giới thiệu', labelEn: 'About', targetId: 'gioi-thieu'},
            {_type: 'headerMenuItem', _key: 'featured', isVisible: true, labelVi: 'Việc làm nổi bật', labelEn: 'Featured jobs', targetId: 'viec-lam-noi-bat'},
            {_type: 'headerMenuItem', _key: 'partners', isVisible: true, labelVi: 'Đối tác', labelEn: 'Partners', targetId: 'doi-tac'},
            {_type: 'headerMenuItem', _key: 'recruitment', isVisible: true, labelVi: 'Tuyển dụng', labelEn: 'Recruitment', targetId: 'tuyen-dung'},
          ],
        },
      },
      managedPageTemplate(
        'managed-page-home',
        'Manage Home Page',
        '/',
        [],
        [
          textItem('home.heroSubtitle', 'Hero Subtitle', 'Kết nối sinh viên với cơ hội thực tập phù hợp'),
          textItem('home.heroDescription', 'Hero Description', 'Khám phá các chương trình thực tập và kết nối với doanh nghiệp đối tác.'),
        ],
      ),
      managedPageTemplate(
        'managed-page-jobs',
        'Manage Jobs Page',
        '/jobs',
        [
          defaultTextSection('jobs-top-note', 'top', 'Jobs Page Announcement', 'Thêm thông báo tuyển dụng hoặc hướng dẫn phía trên danh sách việc làm.'),
          defaultCtaSection('jobs-bottom-cta', 'bottom', 'Need Help Finding Work?', 'Điều hướng ứng viên cập nhật hồ sơ, CV hoặc xem cơ hội nổi bật.', 'Cập nhật hồ sơ', '/profile'),
        ],
        [
          textItem('jobs.page.title', 'Page Title', 'Việc làm thực tập'),
          textItem('jobs.page.description', 'Page Description', 'Tìm kiếm và ứng tuyển các vị trí thực tập phù hợp.'),
          textItem('jobs.page.resultsTitle', 'Results Header', 'Kết quả tìm kiếm'),
          textItem('jobs.page.emptyTitle', 'Empty Results Title', 'Không tìm thấy công việc'),
          textItem('jobs.page.emptyDescription', 'Empty Results Description', 'Thử thay đổi bộ lọc hoặc quay lại sau.'),
        ],
      ),
      managedPageTemplate(
        'managed-page-job-detail',
        'Manage Job Detail Page',
        '/jobs/:jobId',
        [],
      ),
      managedPageTemplate(
        'managed-page-profile',
        'Manage Profile Page',
        '/profile',
        [],
        [
          textItem('profile.personal_info', 'Personal Info Section Title', 'Thông tin cá nhân'),
          textItem('profile.cv_title', 'My CVs Section Title', 'CV của tôi'),
          textItem('profile.companyProfileTitle', 'Company Profile Section Title', 'Hồ sơ công ty'),
          textItem('profile.companyProfileEmpty', 'Company Profile Empty Notice', 'Chưa có hồ sơ công ty. Bấm để cập nhật.'),
          textItem('profile.change_password', 'Change Password Section Title', 'Đổi mật khẩu'),
          textItem('profile.edit', 'Edit Action Label', 'Chỉnh sửa'),
          textItem('profile.cancel', 'Cancel Action Label', 'Hủy'),
          textItem('profile.save', 'Save Action Label', 'Lưu'),
          textItem('profile.last_name', 'Last Name Label', 'Họ'),
          textItem('profile.first_name', 'First Name Label', 'Tên'),
          textItem('profile.phone', 'Phone Number Label', 'Số điện thoại'),
          textItem('profile.dob', 'Date of Birth Label', 'Ngày sinh'),
          textItem('profile.gender_label', 'Gender Label', 'Giới tính'),
          textItem('profile.email', 'Email Label', 'Email'),
          textItem('profile.select', 'Select Dropdown Default Option', 'Chọn'),
          textItem('profile.lastNamePlaceholder', 'Last Name Input Placeholder', 'Nhập họ'),
          textItem('profile.firstNamePlaceholder', 'First Name Input Placeholder', 'Nhập tên'),
          textItem('profile.phonePlaceholder', 'Phone Input Placeholder', 'Nhập số điện thoại'),
          textItem('profile.dobPlaceholder', 'DOB Input Placeholder', 'dd/mm/yyyy'),
          textItem('profile.emailNotifications', 'Email Alerts Title', 'Thông báo qua email'),
          textItem('profile.emailNotificationsDescription', 'Email Alerts Description', 'Nhận cập nhật quan trọng về tài khoản và hồ sơ qua email.'),
          textItem('profile.uploadNewCv', 'Upload CV Button Label', 'Tải lên mới'),
          textItem('profile.drag_drop_cv', 'Drag CV Text Placeholder', 'Kéo thả CV vào đây hoặc bấm để tải lên'),
          textItem('profile.cvColumnName', 'CV Column Header', 'CV'),
          textItem('profile.cvDefault', 'Default CV Badge Label', 'Mặc định'),
          textItem('profile.setDefaultCv', 'Set Default CV Context Label', 'Đặt {name} làm CV mặc định'),
          textItem('profile.deleteCv', 'Delete CV Context Label', 'Xóa CV'),
          textItem('profile.companyTaxCode', 'Tax Code Label', 'Mã số thuế'),
          textItem('profile.companyPhone', 'Company Phone Label', 'Điện thoại'),
          textItem('profile.companyAddress', 'Company Address Label', 'Địa chỉ'),
          textItem('profile.current_password', 'Current Password Placeholder', 'Mật khẩu cũ'),
          textItem('profile.new_password', 'New Password Placeholder', 'Mật khẩu mới'),
          textItem('profile.confirm_password', 'Confirm Password Placeholder', 'Xác nhận mật khẩu'),
        ],
      ),
      managedPageTemplate(
        'managed-page-applications',
        'Manage Applications Page',
        '/applications',
        [
          defaultTextSection('applications-top-note', 'top', 'Applications Guide Banner', 'Đặt hướng dẫn hoặc nhắc nhở quy trình ứng tuyển phía trên dashboard.'),
          defaultCtaSection('applications-bottom-cta', 'bottom', 'Keep Exploring Opportunities', 'Dẫn ứng viên quay lại danh sách việc làm.', 'Tìm việc ngay', '/jobs'),
        ],
        [
          textItem('applications.hero.badge', 'Hero Eyebrow Badge', 'Career dossier'),
          textItem('applications.hero.title', 'Hero Title', 'Trang ứng viên', 'Trang ứng viên', 'Candidate Dashboard'),
          textItem('applications.hero.description', 'Hero Description', 'Theo dõi toàn bộ hồ sơ đã gửi và những vị trí đã được công ty duyệt.'),
          textItem('applications.tabs.submitted', 'Submitted Tab Label', 'Đã gửi'),
          textItem('applications.tabs.accepted', 'Approved Tab Label', 'Đã được duyệt'),
          textItem('applications.empty.submittedTitle', 'No Submitted Applications Notice', 'Bạn chưa gửi hồ sơ nào'),
          textItem('applications.empty.findJobsButton', 'Find Jobs Button Label', 'Tìm việc ngay'),
        ],
      ),
      managedPageTemplate(
        'managed-page-recruiter-verification',
        'Manage Recruiter Verification Page',
        '/recruiter-verification',
        [
          defaultTextSection('recruiter-verification-after-hero-note', 'afterHero', 'Verification Instructions', 'Thêm yêu cầu, thời gian duyệt hoặc ghi chú hồ sơ công ty tại đây.'),
          defaultCtaSection('recruiter-verification-bottom-cta', 'bottom', 'Need to Update Info?', 'Điều hướng nhà tuyển dụng về hồ sơ hoặc dashboard sau khi xác thực.', 'Đến hồ sơ', '/profile'),
        ],
        [
          textItem('recruiterVerification.title', 'Verification Request Title', 'Xác thực nhà tuyển dụng'),
          textItem('recruiterVerification.description', 'Verification Request Description', 'Hoàn tất hồ sơ công ty và gửi cho admin duyệt trước khi trở thành nhà tuyển dụng.'),
          textItem('recruiterVerification.updateTitle', 'Edit Profile Title', 'Chỉnh sửa hồ sơ công ty'),
          textItem('recruiterVerification.updateDescription', 'Edit Profile Description', 'Gửi thông tin cập nhật cho admin duyệt.'),
          textItem('recruiterVerification.sections.branding', 'Branding Section Header', 'Hình ảnh thương hiệu'),
          textItem('recruiterVerification.sections.legal', 'Legal Section Header', 'Thông tin pháp lý'),
          textItem('recruiterVerification.sections.addresses', 'Addresses Section Header', 'Địa chỉ'),
          textItem('recruiterVerification.sections.gallery', 'Gallery Section Header', 'Thư viện ảnh'),
        ],
      ),
      managedPageTemplate(
        'managed-page-company-profile',
        'Manage Company Profile Page',
        '/companies/:companyId',
        [],
      ),
      managedPageTemplate(
        'managed-page-reset-password',
        'Manage Reset Password Page',
        '/reset-password',
        [],
      ),
      managedPageTemplate(
        'managed-page-admin',
        'Manage Admin Dashboard',
        '/admin',
        [
          defaultTextSection('admin-after-hero-note', 'afterHero', 'Internal Operations Note', 'Dùng khu vực này cho thông báo nội bộ hoặc ghi chú vận hành.'),
          defaultSpacerSection('admin-bottom-space', 'bottom', 32),
        ],
        [
          textItem('role.ADMIN', 'Admin Role Badge Label', 'Quản trị'),
          textItem('admin.title', 'Dashboard Title', 'Trang quản trị viên'),
          textItem('admin.description', 'Dashboard Description', 'Quản lý tài khoản, tin tuyển dụng và yêu cầu xác thực nhà tuyển dụng.'),
          textItem('admin.stats.usersTitle', 'Users Link Card Title', 'Tất cả người dùng'),
          textItem('admin.stats.usersDescription', 'Users Link Card Description', 'Bấm để xem danh sách tài khoản'),
          textItem('admin.stats.jobsTitle', 'Jobs Link Card Title', 'Tin tuyển dụng'),
          textItem('admin.stats.auditLogsTitle', 'Audit Logs Link Card Title', 'Audit log', 'Nhật ký chỉnh sửa', 'Audit log'),
          textItem('admin.stats.auditLogsDescription', 'Audit Logs Link Card Description', 'Theo dõi thao tác admin', 'Theo dõi thao tác admin', 'Track admin activity'),
          textItem('admin.stats.emailFormatTitle', 'Email Format Link Card Title', 'Email format', 'Định dạng email', 'Email format'),
          textItem('admin.stats.emailFormatDescription', 'Email Format Link Card Description', 'Colors, font size, header image', 'Màu sắc, cỡ chữ, ảnh tiêu đề', 'Colors, font size, header image'),
          textItem('admin.stats.sanityTitle', 'Sanity Link Card Title', 'Sanity', 'Sanity', 'Sanity'),
          textItem('admin.stats.sanityDescription', 'Sanity Link Card Description', 'Mở Sanity Studio để quản lý nội dung trang và văn bản giao diện', 'Mở Sanity Studio để quản lý nội dung trang và văn bản giao diện', 'Open Sanity Studio to manage page content and interface text'),
          textItem('admin.users.title', 'User Accounts Table Title', 'Danh sách tài khoản người dùng'),
          textItem('admin.jobs.title', 'Job Posts Section Title', 'Tin tuyển dụng'),
          textItem('admin.emailFormat.title', 'Email Design Panel Title', 'Email format'),
          textItem('admin.auditLogs.title', 'Audit Logs Panel Title', 'Nhật ký chỉnh sửa', 'Nhật ký chỉnh sửa', 'Audit log'),
        ],
        adminTheme,
      ),
      managedPageTemplate(
        'managed-page-admin-user-profile',
        'Manage Admin User Profile Page',
        '/admin/users/:userId',
        [],
      ),
      managedPageTemplate(
        'managed-page-admin-company-review',
        'Manage Admin Company Review Page',
        '/admin/company-reviews/:applicationId',
        [],
      ),
      managedPageTemplate(
        'managed-page-recruiter',
        'Manage Recruiter Dashboard',
        '/recruiter',
        [
          defaultTextSection('recruiter-top-note', 'top', 'Recruiter Dashboard Message', 'Thêm hướng dẫn dashboard, quy định đăng tin hoặc nội dung chiến dịch cho nhà tuyển dụng.'),
          defaultCtaSection('recruiter-bottom-cta', 'bottom', 'Ready to Enhance Profile?', 'Điều hướng nhà tuyển dụng đến luồng xác thực hoặc cập nhật hồ sơ.', 'Hồ sơ công ty', '/recruiter-verification'),
        ],
      ),
      managedPageTemplate(
        'managed-page-moderator',
        'Manage Moderator Dashboard',
        '/moderator',
        [
          defaultTextSection('moderator-top-note', 'top', 'Review Queue System Alert', 'Thêm ghi chú chính sách hoặc nhắc nhở quy trình xét duyệt tại đây.'),
          defaultSpacerSection('moderator-bottom-space', 'bottom', 32),
        ],
      ),
    ],
  },
})
