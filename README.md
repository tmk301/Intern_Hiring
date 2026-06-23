# InternHiring - Cổng Thông Tin Tuyển Dụng Thực Tập Sinh (Frontend)

Đây là mã nguồn Frontend của hệ thống tuyển dụng thực tập sinh trực tuyến **InternHiring**, được xây dựng trên nền tảng React 18, Vite, TypeScript và TailwindCSS. Dự án cung cấp trải nghiệm tối ưu và phân quyền chi tiết cho Ứng viên, Nhà tuyển dụng, Kiểm duyệt viên và Quản trị viên hệ thống.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

### Core & State Management
*   **Framework:** React 18 (Sử dụng Vite để tối ưu hóa tốc độ build và HMR)
*   **Ngôn ngữ:** TypeScript (Kiểm soát kiểu dữ liệu chặt chẽ)
*   **Routing:** React Router DOM v6 (Hỗ trợ định tuyến bảo mật và phân quyền Route Guards)
*   **Quản lý trạng thái:** TanStack React Query v5 & React Context API

### Giao diện & Hiệu ứng
*   **Styling:** TailwindCSS & Hệ thống CSS tùy biến (Vanilla CSS)
*   **Component Library:** Các component nguyên bản của Radix UI (được tùy biến qua shadcn-ui)
*   **Hiệu ứng chuyển động:** Framer Motion (cho các tương tác vi mô, hiệu ứng đóng mở modal và slide mượt mà)
*   **Icons:** Lucide React

### Tích hợp & Tiện ích
*   **Xác thực tài khoản:** Supabase Auth (Tích hợp đồng bộ hóa session tự động với Spring Boot Backend qua JWT)
*   **Lưu trữ dữ liệu:** Supabase Storage (Xử lý tải lên tệp CV, ảnh đại diện và lưu trữ ảnh mẫu email)
*   **CMS Integration:** Sanity CMS (Quản lý cấu hình giao diện trang chủ, ảnh banner và màu sắc chủ đề động)
*   **Đa ngôn ngữ:** `i18next` (Hỗ trợ chuyển đổi nhanh chóng giữa Tiếng Việt và Tiếng Anh)
*   **Quản lý Form:** React Hook Form kết hợp xác thực dữ liệu qua Zod schema

---

## 🌟 Các Tính Năng Chính

### 1. Phân Quyền Người Dùng & Dashboard Riêng Biệt
*   **Ứng viên (Candidate):** Tìm kiếm và lưu việc làm yêu thích, quản lý danh sách CV (tối đa 3 CV), nộp hồ sơ trực tuyến và theo dõi trạng thái ứng tuyển.
*   **Nhà tuyển dụng (Recruiter):** Đăng tin tuyển dụng, quản lý danh sách ứng viên nộp bài, phê duyệt/từ chối hồ sơ, cập nhật thông tin doanh nghiệp và tải tài liệu xác thực công ty.
*   **Kiểm duyệt viên (Moderator):** Phê duyệt hoặc từ chối các tin đăng tuyển dụng mới, duyệt hồ sơ đăng ký doanh nghiệp của nhà tuyển dụng.
*   **Quản trị viên (Admin):** Quản lý toàn bộ tài khoản người dùng, phân quyền hệ thống, quản lý danh mục ngành nghề, chỉnh sửa cấu hình giao diện trang chủ và cấu hình mẫu email.

### 2. Bộ Lọc Việc Làm & Bản Đồ Địa Điểm
*   Tìm kiếm việc làm nâng cao theo từ khóa, tỉnh thành tại Việt Nam, mức lương và loại hình thực tập.
*   Tích hợp **Bản đồ Google Maps dạng nhúng** giúp hiển thị trực quan địa chỉ công ty ngay trên trang chi tiết việc làm.

### 3. Đa Ngôn Ngữ (i18n)
*   Hỗ trợ chuyển dịch toàn bộ giao diện giữa Tiếng Việt (`vi.json`) và Tiếng Anh (`en.json`).
*   Đồng bộ định dạng ngày tháng, nhãn trạng thái và thông báo lỗi tương ứng với ngôn ngữ được chọn.

### 4. Hộp Thoại & Tiện Ích Tương Tác
*   **Cắt ảnh đại diện:** Hộp thoại `<AvatarCropDialog>` tích hợp thư viện `react-easy-crop` giúp người dùng cắt ảnh đại diện theo tỷ lệ tròn hoàn hảo trước khi tải lên lưu trữ.
*   **Xác nhận đăng xuất:** Hộp thoại xác nhận đăng xuất bảo mật, ngăn ngừa xung đột focus của trình duyệt khi đóng mở menu.
*   **Tooltip cảnh báo:** Chuyển đổi các banner cảnh báo cồng kềnh thành các Tooltip hover màu vàng hổ phách tinh tế cạnh các biểu tượng cảnh báo ứng tuyển.

### 5. Hệ Thống Thông Báo Trên Trình Duyệt
*   **Tiêu đề Tab:** Tự động đính kèm số lượng thông báo chưa đọc vào tiêu đề tab trình duyệt, ví dụ: `InternHiring (2)`.
*   **Favicon động:** Sử dụng canvas để tự động vẽ một chấm đỏ thông báo nhỏ ở góc trên bên phải của favicon khi có thông báo mới, tự động khôi phục về favicon gốc khi đã đọc hết.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
Intern_Hiring/
├── public/                  # Các tài nguyên tĩnh (favicon, robots.txt, template mẫu)
├── src/
│   ├── assets/              # Hình ảnh cục bộ và các tệp style gốc
│   ├── components/
│   │   ├── admin/           # Các bảng điều khiển của Admin (Ví dụ: CategoryManagementPanel)
│   │   ├── jobs/            # Bộ lọc tìm kiếm, thanh tìm kiếm, tích hợp bản đồ
│   │   └── ui/              # Thanh điều hướng (Navbar), nút thông báo và các component Radix UI
│   ├── context/
│   │   └── AuthContext.tsx  # Quản lý phiên đăng nhập Supabase và ngữ cảnh người dùng toàn cục
│   ├── hooks/               # Các custom hooks hữu ích (ví dụ: dùng thông báo Toast)
│   ├── lib/
│   │   ├── api.ts           # Gọi API tích hợp với Spring Boot Backend
│   │   ├── i18n.ts          # Thiết lập đa ngôn ngữ
│   │   ├── siteConfig.ts    # Fetch cấu hình trang từ Sanity CMS
│   │   ├── supabase.ts      # Khởi tạo Supabase Client
│   │   └── roles.ts         # Tiện ích kiểm tra vai trò người dùng (Roles check)
│   ├── locales/             # Tệp ngôn ngữ vi.json và en.json
│   ├── pages/               # Các trang chính (Đăng nhập, Đăng ký, Dashboard, Hồ sơ cá nhân)
│   ├── App.tsx              # Khởi tạo định tuyến chính (Router)
│   ├── index.css            # Chỉ định Tailwind và các hiệu ứng toàn cục
│   └── main.tsx             # Điểm khởi chạy của ứng dụng React
├── components.json          # Cấu hình Shadcn CLI
├── tailwind.config.ts       # Định nghĩa các mã màu thiết kế, font chữ, animation
└── vite.config.ts           # Cấu hình bundler Vite và alias đường dẫn
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy

### 📋 Yêu Cầu Hệ Thống
*   Node.js (Phiên bản 18 trở lên)
*   npm / pnpm / bun / yarn

### 💻 Khởi Chạy
1.  Cài đặt các gói thư viện phụ thuộc:
    ```bash
    npm install
    ```
2.  Khởi chạy máy chủ phát triển cục bộ (Local Development Server):
    ```bash
    npm run dev
    ```
3.  Biên dịch dự án cho môi trường production:
    ```bash
    npm run build
    ```
4.  Kiểm tra tính an toàn kiểu dữ liệu với TypeScript:
    ```bash
    npx tsc --noEmit
    ```
