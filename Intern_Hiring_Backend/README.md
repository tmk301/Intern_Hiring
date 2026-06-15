# Intern Hiring Backend API

Hệ thống Backend API quản lý tuyển dụng thực tập sinh, được xây dựng theo chuẩn **RESTful API** và kiến trúc Layered Architecture (N-Tier), đảm bảo tính bảo mật và dễ bảo trì.

## 🚀 Công nghệ sử dụng (Tech Stack)
- **Ngôn ngữ:** Java 25
- **Framework:** Spring Boot 4.0.6
- **Database:** PostgreSQL
- **ORM:** Spring Data JPA / Hibernate
- **Bảo mật:** Spring Security + JWT (JSON Web Tokens)
- **Tools:** Gradle, Lombok, Spring Boot Validation

---

## 🏗 Cấu trúc dự án (Folder Structure)

Dự án áp dụng chặt chẽ kiến trúc phân lớp, tách biệt rõ ràng trách nhiệm của từng module. Dưới đây là mô tả chi tiết từng thư mục trong `src/main/java/com/internhiring/backend/`:

### 1. `config/` (Cấu hình hệ thống)
Chứa các lớp cấu hình cốt lõi của Spring Boot.
- **`SecurityConfig`**: Cấu hình bảo mật toàn cục, chặn/cho phép các API (như mở khóa `/api/auth/**`), phân quyền truy cập. Nó cũng quản lý tập trung chính sách CORS (`CorsConfigurationSource`) cho phép kết nối an toàn từ Frontend React, và thiết lập stateless session cho JWT.

### 2. `security/` (Bảo mật & Xác thực)
Chuyên biệt xử lý cơ chế xác thực JWT và bảo vệ API.
- **`JwtUtils`**: Lớp tiện ích sinh, phân tích và xác thực JSON Web Token.
- **`JwtAuthFilter`**: Bộ lọc (Filter) chặn mọi request để trích xuất và kiểm tra tính hợp lệ của token trước khi chuyển đến Controller.
- **`CustomUserDetailsService`**: Giao tiếp với Database để load thông tin người dùng phục vụ cho Spring Security kiểm tra quyền.

### 3. `controller/` (Lớp API Endpoints)
Tiếp nhận HTTP request từ Frontend, điều hướng đến Service và trả về HTTP response. Lớp này tuyệt đối không chứa business logic.
- **`AuthController`**: Xử lý đăng nhập (`/login`) và đăng ký (`/register`).
- **`UserController`**: Xử lý các thao tác quản trị tài khoản (CRUD).

### 4. `service/` (Lớp Nghiệp vụ - Business Logic)
Trái tim của hệ thống. Chứa toàn bộ logic xử lý nghiệp vụ phức tạp.
- **`UserService`**: Chịu trách nhiệm mã hóa mật khẩu khi tạo hoặc cập nhật, kiểm tra trùng lặp email, và chuyển đổi (map) dữ liệu từ Entity (DB) sang DTO (Frontend) để bảo vệ thông tin.

### 5. `repository/` (Lớp Truy xuất dữ liệu)
Giao tiếp trực tiếp với cơ sở dữ liệu.
- **`UserRepository`**: Sử dụng Spring Data JPA để thực hiện các câu query sẵn có (như `findByEmail`, `existsByEmail`) mà không cần viết lệnh SQL thủ công.

### 6. `entity/` (Mô hình Dữ liệu)
Chứa các class ánh xạ trực tiếp (1-1) với các bảng trong Database thông qua Hibernate ORM.
- **`User`**: Đại diện cho bảng `users`.
- **`Role`**: Enum phân quyền (`ADMIN`, `USER`).

### 7. `dto/` (Data Transfer Objects)
Khung chứa dữ liệu dùng để giao tiếp giữa Client và Server. Việc sử dụng DTO giúp bảo vệ hệ thống khỏi lỗ hổng *Mass Assignment* và ngăn rò rỉ dữ liệu nhạy cảm.
- **`RegisterRequest` / `UpdateUserRequest`**: Định dạng dữ liệu Client gửi lên.
- **`UserResponse`**: Dữ liệu Server trả về cho Client (đã lọc bỏ password).
- **`LoginRequest`**: Yêu cầu đăng nhập.

### 8. `exception/` (Xử lý Lỗi Tập trung)
Chứa các ngoại lệ tự định nghĩa và nơi hứng lỗi của toàn hệ thống.
- **`GlobalExceptionHandler`**: Sử dụng `@ControllerAdvice` để tự động bắt lỗi và thống nhất format trả về một khối JSON chuẩn mực kèm HTTP Status Code (400, 404, 500).
- **`UserAlreadyExistsException`, `UserNotFoundException`**: Các lỗi tự định nghĩa.

---

## 🛠 Hướng dẫn cài đặt & Chạy (Setup & Run)

### 1. Yêu cầu hệ thống
- JDK 25+
- PostgreSQL server đang chạy (local hoặc remote)

### 2. Cấu hình Database
Tạo một cơ sở dữ liệu mới trong PostgreSQL với tên `intern_hiring`.
Cập nhật lại file cấu hình nếu cần thiết:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/intern_hiring
    username: postgres # Đổi username của bạn
    password: [PASSWORD] # Đổi password của bạn
```

### 3. Build và Chạy dự án
Mở terminal tại thư mục gốc của dự án (`Intern_Hiring_Backend`) và chạy lệnh sau:

**Kiểm tra build:**
```bash
./gradlew build
```

**Khởi chạy server (tự reload khi code thay đổi):**
```bash
./gradlew bootRun -t
```
