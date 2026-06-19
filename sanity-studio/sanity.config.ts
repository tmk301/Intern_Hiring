import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

const textItem = (key: string, label: string, value: string) => ({
  _type: 'managedInterfaceText',
  key,
  label,
  value,
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
  sections: Array<Record<string, unknown>>,
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
    sections,
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
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev,
      managedPageTemplate(
        'managed-page-home',
        'Quản lý Trang chủ',
        '/',
        [],
        [
          textItem('home.heroSubtitle', 'Phụ đề hero', 'Kết nối sinh viên với cơ hội thực tập phù hợp'),
          textItem('home.heroDescription', 'Mô tả hero', 'Khám phá các chương trình thực tập và kết nối với doanh nghiệp đối tác.'),
        ],
      ),
      managedPageTemplate(
        'managed-page-jobs',
        'Quản lý Trang việc làm',
        '/jobs',
        [
          defaultTextSection('jobs-top-note', 'top', 'Thông báo trang việc làm', 'Thêm thông báo tuyển dụng hoặc hướng dẫn phía trên danh sách việc làm.'),
          defaultCtaSection('jobs-bottom-cta', 'bottom', 'Cần hỗ trợ tìm việc?', 'Điều hướng ứng viên cập nhật hồ sơ, CV hoặc xem cơ hội nổi bật.', 'Cập nhật hồ sơ', '/profile'),
        ],
        [
          textItem('jobs.page.title', 'Tiêu đề trang', 'Việc làm thực tập'),
          textItem('jobs.page.description', 'Mô tả trang', 'Tìm kiếm và ứng tuyển các vị trí thực tập phù hợp.'),
          textItem('jobs.page.resultsTitle', 'Tiêu đề kết quả', 'Kết quả tìm kiếm'),
          textItem('jobs.page.emptyTitle', 'Tiêu đề khi rỗng', 'Không tìm thấy công việc'),
          textItem('jobs.page.emptyDescription', 'Mô tả khi rỗng', 'Thử thay đổi bộ lọc hoặc quay lại sau.'),
        ],
      ),
      managedPageTemplate(
        'managed-page-profile',
        'Quản lý Trang hồ sơ',
        '/profile',
        [
        ],
        [
          textItem('profile.personal_info', 'Tiêu đề thông tin cá nhân', 'Thông tin cá nhân'),
          textItem('profile.cv_title', 'Tiêu đề khu vực CV', 'CV của tôi'),
          textItem('profile.companyProfileTitle', 'Tiêu đề hồ sơ công ty', 'Hồ sơ công ty'),
          textItem('profile.companyProfileEmpty', 'Thông báo chưa có hồ sơ công ty', 'Chưa có hồ sơ công ty. Bấm để cập nhật.'),
          textItem('profile.change_password', 'Tiêu đề đổi mật khẩu', 'Đổi mật khẩu'),
          textItem('profile.edit', 'Nút chỉnh sửa', 'Chỉnh sửa'),
          textItem('profile.cancel', 'Nút hủy', 'Hủy'),
          textItem('profile.save', 'Nút lưu', 'Lưu'),
          textItem('profile.last_name', 'Nhãn họ', 'Họ'),
          textItem('profile.first_name', 'Nhãn tên', 'Tên'),
          textItem('profile.phone', 'Nhãn số điện thoại', 'Số điện thoại'),
          textItem('profile.dob', 'Nhãn ngày sinh', 'Ngày sinh'),
          textItem('profile.gender_label', 'Nhãn giới tính', 'Giới tính'),
          textItem('profile.email', 'Nhãn email', 'Email'),
          textItem('profile.select', 'Lựa chọn rỗng', 'Chọn'),
          textItem('profile.lastNamePlaceholder', 'Placeholder họ', 'Nhập họ'),
          textItem('profile.firstNamePlaceholder', 'Placeholder tên', 'Nhập tên'),
          textItem('profile.phonePlaceholder', 'Placeholder số điện thoại', 'Nhập số điện thoại'),
          textItem('profile.dobPlaceholder', 'Placeholder ngày sinh', 'dd/mm/yyyy'),
          textItem('profile.emailNotifications', 'Nhãn thông báo email', 'Thông báo qua email'),
          textItem('profile.emailNotificationsDescription', 'Mô tả thông báo email', 'Nhận cập nhật quan trọng về tài khoản và hồ sơ qua email.'),
          textItem('profile.uploadNewCv', 'Nút tải CV', 'Tải lên mới'),
          textItem('profile.drag_drop_cv', 'Hướng dẫn kéo thả CV', 'Kéo thả CV vào đây hoặc bấm để tải lên'),
          textItem('profile.cvColumnName', 'Cột CV', 'CV'),
          textItem('profile.cvDefault', 'Cột CV mặc định', 'Mặc định'),
          textItem('profile.setDefaultCv', 'Nhãn đặt CV mặc định', 'Đặt {name} làm CV mặc định'),
          textItem('profile.deleteCv', 'Nhãn xóa CV', 'Xóa CV'),
          textItem('profile.companyTaxCode', 'Nhãn mã số thuế', 'Mã số thuế'),
          textItem('profile.companyPhone', 'Nhãn điện thoại công ty', 'Điện thoại'),
          textItem('profile.companyAddress', 'Nhãn địa chỉ công ty', 'Địa chỉ'),
          textItem('profile.current_password', 'Placeholder mật khẩu cũ', 'Mật khẩu cũ'),
          textItem('profile.new_password', 'Placeholder mật khẩu mới', 'Mật khẩu mới'),
          textItem('profile.confirm_password', 'Placeholder xác nhận mật khẩu', 'Xác nhận mật khẩu'),
        ],
      ),
      managedPageTemplate(
        'managed-page-applications',
        'Quản lý Trang ứng tuyển',
        '/applications',
        [
          defaultTextSection('applications-top-note', 'top', 'Thông báo ứng tuyển', 'Đặt hướng dẫn hoặc nhắc nhở quy trình ứng tuyển phía trên dashboard.'),
          defaultCtaSection('applications-bottom-cta', 'bottom', 'Tiếp tục khám phá cơ hội', 'Dẫn ứng viên quay lại danh sách việc làm.', 'Tìm việc ngay', '/jobs'),
        ],
        [
          textItem('applications.hero.badge', 'Nhãn hero', 'Career dossier'),
          textItem('applications.hero.title', 'Tiêu đề hero', 'Ứng tuyển'),
          textItem('applications.hero.description', 'Mô tả hero', 'Theo dõi toàn bộ hồ sơ đã gửi và những vị trí đã được công ty duyệt.'),
          textItem('applications.tabs.submitted', 'Tab đã gửi', 'Đã gửi'),
          textItem('applications.tabs.accepted', 'Tab đã được duyệt', 'Đã được duyệt'),
          textItem('applications.empty.submittedTitle', 'Tiêu đề khi chưa gửi hồ sơ', 'Bạn chưa gửi hồ sơ nào'),
          textItem('applications.empty.findJobsButton', 'Nút tìm việc', 'Tìm việc ngay'),
        ],
      ),
      managedPageTemplate(
        'managed-page-recruiter-verification',
        'Quản lý Trang xác thực nhà tuyển dụng',
        '/recruiter-verification',
        [
          defaultTextSection('recruiter-verification-after-hero-note', 'afterHero', 'Hướng dẫn xác thực', 'Thêm yêu cầu, thời gian duyệt hoặc ghi chú hồ sơ công ty tại đây.'),
          defaultCtaSection('recruiter-verification-bottom-cta', 'bottom', 'Cần cập nhật hồ sơ?', 'Điều hướng nhà tuyển dụng về hồ sơ hoặc dashboard sau khi xác thực.', 'Đến hồ sơ', '/profile'),
        ],
        [
          textItem('recruiterVerification.title', 'Tiêu đề tạo hồ sơ', 'Xác thực nhà tuyển dụng'),
          textItem('recruiterVerification.description', 'Mô tả tạo hồ sơ', 'Hoàn tất hồ sơ công ty và gửi cho admin duyệt trước khi trở thành nhà tuyển dụng.'),
          textItem('recruiterVerification.updateTitle', 'Tiêu đề cập nhật hồ sơ', 'Chỉnh sửa hồ sơ công ty'),
          textItem('recruiterVerification.updateDescription', 'Mô tả cập nhật hồ sơ', 'Gửi thông tin cập nhật cho admin duyệt.'),
          textItem('recruiterVerification.sections.branding', 'Khu vực hình ảnh thương hiệu', 'Hình ảnh thương hiệu'),
          textItem('recruiterVerification.sections.legal', 'Khu vực pháp lý', 'Thông tin pháp lý'),
          textItem('recruiterVerification.sections.addresses', 'Khu vực địa chỉ', 'Địa chỉ'),
          textItem('recruiterVerification.sections.gallery', 'Khu vực thư viện ảnh', 'Thư viện ảnh'),
        ],
      ),
      managedPageTemplate(
        'managed-page-admin',
        'Quản lý Dashboard admin',
        '/admin',
        [
          defaultTextSection('admin-after-hero-note', 'afterHero', 'Thông báo admin', 'Dùng khu vực này cho thông báo nội bộ hoặc ghi chú vận hành.'),
          defaultSpacerSection('admin-bottom-space', 'bottom', 32),
        ],
        [
          textItem('role.ADMIN', 'Nhãn vai trò admin', 'Quản trị'),
          textItem('admin.title', 'Tiêu đề trang', 'Trang quản trị viên'),
          textItem('admin.description', 'Mô tả trang', 'Quản lý tài khoản, tin tuyển dụng và yêu cầu xác thực nhà tuyển dụng.'),
          textItem('admin.stats.usersTitle', 'Tiêu đề thẻ người dùng', 'Tất cả người dùng'),
          textItem('admin.stats.usersDescription', 'Mô tả thẻ người dùng', 'Bấm để xem danh sách tài khoản'),
          textItem('admin.stats.jobsTitle', 'Tiêu đề thẻ tin tuyển dụng', 'Tin tuyển dụng'),
          textItem('admin.stats.categoriesTitle', 'Tiêu đề thẻ danh mục', 'Quản lý danh mục'),
          textItem('admin.stats.categoriesDescription', 'Mô tả thẻ danh mục', 'Danh mục & Form xác thực'),
          textItem('admin.stats.auditLogsTitle', 'Tiêu đề thẻ audit log', 'Audit log'),
          textItem('admin.stats.auditLogsDescription', 'Mô tả thẻ audit log', 'Theo dõi thao tác admin'),
          textItem('admin.stats.emailFormatTitle', 'Tiêu đề thẻ định dạng email', 'Email format'),
          textItem('admin.stats.emailFormatDescription', 'Mô tả thẻ định dạng email', 'Colors, font size, header image'),
          textItem('admin.stats.loginBrandingTitle', 'Tiêu đề thẻ login/register', 'Ô login & đăng ký'),
          textItem('admin.stats.loginBrandingDescription', 'Mô tả thẻ login/register', 'Chỉnh ở bên trái trong Sanity'),
          textItem('admin.users.title', 'Tiêu đề bảng người dùng', 'Danh sách tài khoản người dùng'),
          textItem('admin.jobs.title', 'Tiêu đề khu vực tin tuyển dụng', 'Tin tuyển dụng'),
          textItem('admin.emailFormat.title', 'Tiêu đề định dạng email', 'Email format'),
          textItem('admin.auditLogs.title', 'Tiêu đề audit log', 'Audit log'),
        ],
        adminTheme,
      ),
      managedPageTemplate(
        'managed-page-recruiter',
        'Quản lý Dashboard nhà tuyển dụng',
        '/recruiter',
        [
          defaultTextSection('recruiter-top-note', 'top', 'Thông báo nhà tuyển dụng', 'Thêm hướng dẫn dashboard, quy định đăng tin hoặc nội dung chiến dịch cho nhà tuyển dụng.'),
          defaultCtaSection('recruiter-bottom-cta', 'bottom', 'Sẵn sàng cải thiện hồ sơ công ty?', 'Điều hướng nhà tuyển dụng đến luồng xác thực hoặc cập nhật hồ sơ.', 'Hồ sơ công ty', '/recruiter-verification'),
        ],
      ),
      managedPageTemplate(
        'managed-page-moderator',
        'Quản lý Dashboard kiểm duyệt',
        '/moderator',
        [
          defaultTextSection('moderator-top-note', 'top', 'Thông báo kiểm duyệt', 'Thêm ghi chú chính sách hoặc nhắc nhở quy trình xét duyệt tại đây.'),
          defaultSpacerSection('moderator-bottom-space', 'bottom', 32),
        ],
      ),
    ],
  },
})
