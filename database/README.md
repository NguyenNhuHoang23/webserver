# Database local

Dự án dùng MariaDB/MySQL của XAMPP cho database local. XAMPP mặc định thường chạy ở `127.0.0.1:3306` với user `root` và mật khẩu rỗng.

## Khởi tạo

```powershell
pnpm db:init
```

Lệnh trên chạy [schema.sql](./schema.sql), tạo database `ems_local`, các bảng domain EMS và dữ liệu demo. Có thể chạy lại an toàn.

Nếu XAMPP dùng thông tin khác, đặt biến môi trường trước khi chạy:

```powershell
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "3306"
$env:DB_USER = "root"
$env:DB_PASSWORD = ""
pnpm db:init
```

Mật khẩu demo được seed là `123456` dưới dạng SHA-256 trong database. UI đọc/ghi dữ liệu qua các Route Handler `/api/ems/*` và phiên đăng nhập được lưu bằng cookie HTTP-only.

Các phần cấu hình cảnh báo, cấu hình dự án, cảnh báo phát sinh, telemetry mẫu và vị trí sơ đồ đều được lưu trong MariaDB. Nếu MariaDB của XAMPP báo lỗi bảng quyền hệ thống `mysql.db`, có thể chạy instance cục bộ bằng `mysqld --defaults-file=C:\xampp\mysql\bin\my.ini --skip-grant-tables --bind-address=127.0.0.1` rồi chạy lại `pnpm db:init`.
