# Trọ Xanh phiên bản 1.3

**Bản 1.3 — tìm kiếm toàn quốc, so sánh chi phí, đánh giá sau thuê và báo cáo tin.**

Xem [hướng dẫn bản 1.3](docs/NANG-CAP-1.3.md) và [giao dịch mô phỏng](docs/NANG-CAP-1.2.md). Có 97 bài kiểm thử tự động đạt. Giao dịch cọc, hóa đơn và hoa hồng trên website hiện chỉ là sổ mô phỏng, chưa chuyển tiền thật.


Website tìm phòng và quản lý nhà trọ, bản chạy trên máy cho đồ án. Giao diện tiếng Việt với màu xanh dương. Cơ sở dữ liệu SQLite thật, mở được bằng DB Browser for SQLite.

## 1. Chạy website

1. Cài **Node.js 24 LTS trở lên** tại https://nodejs.org/ nếu máy chưa có. Bản này không cần cài npm package.
2. Giải nén toàn bộ thư mục. Bấm đúp `START.bat` trên Windows. Giữ cửa sổ máy chủ mở.
3. Mở http://localhost:3530 bằng Chrome hoặc Edge. Nếu cổng đang chạy, sử dụng trang đã mở hoặc dừng máy chủ cũ bằng Ctrl+C.
4. Dừng bằng Ctrl+C. Khi mở lại, tài khoản, phòng, hợp đồng và hóa đơn vẫn còn.

Hoặc trong Terminal tại thư mục dự án:

```powershell
node server.mjs
```

Nếu cổng 3530 bị dùng bởi chương trình khác:

```powershell
$env:PORT='3531'
node server.mjs
```

Mở http://localhost:3531. Máy chủ mặc định chỉ lắng nghe trên máy hiện tại ở 127.0.0.1.

## 2. Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Quản trị viên | admin@troxanh.local | Admin@12345 |
| Chủ trọ đã cấp quyền | chutro@troxanh.local | ChuTro@12345 |
| Người tìm phòng | timphong@troxanh.local | TimPhong@12345 |
| Chủ trọ chờ duyệt | choduyet@troxanh.local | ChoDuyet@12345 |

Trang đăng nhập có nút điền tài khoản mẫu. Đây là thông tin demo đã công khai trong mã nguồn, chỉ dùng dữ liệu giả để học và trình diễn trên máy. Không đưa nguyên bộ tài khoản này lên Internet.

## 3. Các vai trò và quy trình

- **Khách chưa đăng nhập:** tìm kiếm, lọc và xem chi tiết tin đã duyệt; đọc cẩm nang.
- **Người tìm phòng:** đăng ký, đăng nhập, lưu phòng, gửi lời nhắn/lịch xem, xem hợp đồng và hóa đơn gắn với ID tài khoản của mình.
- **Chủ trọ:** đăng ký, vào “Dành cho chủ trọ”, gửi thông tin liên hệ và hồ sơ minh chứng quyền cho thuê. Quản trị viên đối chiếu trước khi cấp quyền. Tài khoản chưa được cấp quyền bị máy chủ chặn đăng bài. Sau khi được duyệt: quản lý phòng, gửi/sửa/ẩn tin, nhận và xác nhận lịch xem, lập/kết thúc hợp đồng, lập hóa đơn và ghi nhận đã thu.
- **Quản trị viên:** xem yêu cầu, liên hệ xác minh bên ngoài hệ thống, ghi chú cấp quyền/từ chối, duyệt/từ chối/ẩn tin, khóa/mở tài khoản và xem nhật ký.

Sửa tin sẽ đưa tin về chờ duyệt. Phòng có hợp đồng hiệu lực sẽ không xuất hiện trong kết quả phòng trống. Kết thúc hợp đồng không xóa hóa đơn lịch sử. Mỗi phòng chỉ có một hợp đồng đang hiệu lực; mỗi hợp đồng chỉ có một hóa đơn trong một tháng.

## 4. Mở bằng DB Browser for SQLite

DB Browser là công cụ quản trị, còn SQLite là cơ sở dữ liệu. Bạn không cần đổi sang MySQL cho bản đồ án hiện tại.

1. Khởi động website ít nhất một lần để tạo `data/tro-xanh.db`.
2. Dừng máy chủ bằng Ctrl+C trước khi sửa database bằng công cụ ngoài.
3. Trong DB Browser chọn **Open Database**, mở file `data/tro-xanh.db` (không phải file `.db-wal` hoặc `.db-shm`).
4. **Database Structure:** xem bảng và khóa; **Browse Data:** xem dữ liệu; **Execute SQL:** chạy truy vấn.
5. Nếu đã sửa dữ liệu, chọn **Write Changes** trước khi đóng DB Browser và mở lại website. Nên thao tác nghiệp vụ qua website để giữ nhật ký và trạng thái đồng bộ.

Ví dụ truy vấn chỉ đọc:

```sql
SELECT id, name, email, role, approved FROM users;
SELECT id, title, price, status, occupancy FROM listings;
SELECT i.id, i.month, i.total, i.status, c.tenant_name
FROM invoices i JOIN leases c ON c.id = i.lease_id;
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

Không tự sửa `password_hash`, `sessions` hay trạng thái hợp đồng bằng tay. Mật khẩu được băm scrypt; không thể đọc lại mật khẩu gốc từ database.

## 5. Sao lưu và khôi phục

```powershell
node backup.mjs
```

Lệnh sao lưu SQLite bằng API backup và chép ảnh vào `data/backups/<thời-gian>/`. Tránh tải ảnh mới đúng lúc đang sao lưu để bản chụp dữ liệu và ảnh khớp nhau.

Khôi phục: dừng máy chủ, giữ một bản sao thư mục dữ liệu hiện tại, chép `tro-xanh.db` từ bản sao lưu vào `data/` và chép thư mục `uploads` đi cùng. Khi máy chủ đã dừng hoàn toàn, chuyển các file `tro-xanh.db-wal` và `tro-xanh.db-shm` cũ sang thư mục dự phòng cùng database cũ, không giữ chúng cạnh database được khôi phục. Sau đó khởi động lại và kiểm tra dữ liệu.

## 6. Kiểm thử

```powershell
node --test tests/*.test.mjs
```

97 bài kiểm thử tích hợp chạy bằng máy chủ thật và database tạm riêng biệt, không đụng dữ liệu đang dùng. Phạm vi gồm phân quyền bốn nhóm, CSRF, đăng ký/đăng nhập, yêu cầu cấp quyền, duyệt tin, tìm kiếm, lưu phòng, lịch xem, hợp đồng, tính hóa đơn, khóa tài khoản, dữ liệu lưu bền và toàn vẹn khóa ngoại. Kết quả bàn giao nằm trong `docs/KIEM-THU.md`.

## 7. Cấu trúc mã nguồn

```text
server.mjs       HTTP server, API, xác thực, phân quyền và nghiệp vụ
db.mjs           Kết nối SQLite, băm mật khẩu, tạo dữ liệu mẫu
schema.sql       Các bảng lõi
upgrade.mjs/sql  Chat, minh chứng, đề nghị thuê và sổ giao dịch
community.mjs/sql So sánh, đánh giá và báo cáo tin
addresses.mjs    Danh mục địa chỉ và chuẩn hóa tên tỉnh
resources/      Dữ liệu 34 tỉnh/thành, 3.321 phường/xã/đặc khu
public/          HTML, CSS, JavaScript phía trình duyệt
tests/           Kiểm thử tích hợp
data/            Database, ảnh tải lên và bản sao lưu
docs/            Biên bản kiểm thử và sơ đồ
backup.mjs       Công cụ sao lưu
START.bat        Khởi động trên Windows
```

## 8. Phạm vi nền tảng và triển khai

Bản chạy local cho học tập và trình diễn. Chưa có xác thực email, quên/đổi mật khẩu, gửi SMS/email tự động, thanh toán ngân hàng, ký hợp đồng điện tử hay bản đồ. Chủ trọ nhập email của tài khoản người tìm phòng đã đăng ký để hệ thống lưu `tenant_user_id`; quyền xem hợp đồng và hóa đơn dựa trên ID này. Nếu email chưa đăng ký hoặc sai vai trò, hệ thống từ chối liên kết. Có thể để trống email khi quản lý nội bộ. Trước khi vận hành công khai vẫn phải bổ sung xác minh email và quy trình xác nhận hợp đồng. Chủ trọ có thể ghi thu trực tiếp. Bản 1.2 bổ sung mô phỏng đối soát giao dịch cho khách và quản trị viên; chưa thực hiện giao dịch tiền thật.

Ảnh mẫu được hiển thị từ Unsplash và cần Internet; nếu tải ảnh mạng thất bại website dùng hình dự phòng trong dự án. Ảnh chủ trọ tải lên được lưu ở `data/uploads`. Tên, số điện thoại, địa chỉ và ảnh trong dữ liệu mẫu chỉ để minh họa.

`DEMO=0` tắt việc tạo mới tài khoản mẫu và nút điền demo; không xóa tài khoản mẫu đã có. Khi triển khai thật cần database sạch, tạo quản trị viên bằng quy trình riêng, HTTPS, `COOKIE_SECURE=1`, kiểm soát lưu trữ ảnh, bảo vệ sao lưu, xác minh email, phục hồi mật khẩu, quản lý secrets và kiểm thử tải. Không đặt `HOST=0.0.0.0` trước khi hoàn thiện các bước triển khai đó.

## Tài liệu công nghệ

- Node.js SQLite API: https://nodejs.org/docs/latest-v24.x/api/sqlite.html
- DB Browser for SQLite: https://sqlitebrowser.org/
- SQLite: https://www.sqlite.org/docs.html

Ngày cập nhật: 24/10/2026. Cập nhật báo cáo Word và biên bản kiểm thử khi bổ sung chức năng ở các lần tiếp theo.

## 9. Cập nhật sau đợt kiểm thử kỹ

Đợt 1.1 bổ sung 20 bài hồi quy, tổng cộng 42 bài đạt; bản 1.2 thêm 35 bài, tổng cộng 77 bài đạt. Đã sửa kiểm tra kiểu số, mật khẩu có dấu cách, lịch không tồn tại, dữ liệu nội bộ trong API công khai, lỗi URL và liên kết quyền người thuê. Tìm kiếm hỗ trợ không dấu và hoa thường; `%` và `_` không còn biến thành ký tự đại diện.

Database cũ được tự nâng cấp thêm cột `tenant_user_id` khi khởi động. Các hợp đồng có email khớp tài khoản seeker sẵn có sẽ được liên kết. Dữ liệu không bị xóa; không dùng file database mẫu để chép đè database đang sử dụng.



Thư mục `docs/so-do-chi-tiet/` chứa 28 sơ đồ hoạt động và 28 sơ đồ tuần tự, kèm mã PlantUML để tiếp tục chỉnh sửa.

## 10. Chức năng bản 1.3

- Chọn đủ 34 tỉnh/thành và 3.321 phường/xã/đặc khu theo danh mục từ 01/07/2025, kể cả nơi chưa có tin. Tìm tên khu vực có dấu hoặc không dấu; giữ nhóm địa chỉ cũ. Xem [nguồn dữ liệu](docs/DIA-CHI-VIET-NAM.md).
- So sánh 2–3 phòng còn công khai; ước tính tiền thuê, điện, nước, phí dịch vụ và khoản cần chuẩn bị tháng đầu gồm cọc.
- Tài khoản có hợp đồng liên kết đã bắt đầu thuê gửi một đánh giá/hợp đồng. Quản trị viên kiểm duyệt nội dung trước khi công khai; không loại chỉ vì ít sao.
- Báo cáo tin riêng tư với 4 lý do; một báo cáo mở/người/tin, tối đa 10 báo cáo/ngày. Quản trị viên ghi kết quả, có thể ẩn tin khi xử lý.

Schema phiên bản 4 gồm 20 bảng nghiệp vụ. Migration giữ dữ liệu hiện có. Khi sao chép mã nguồn sang máy khác, lần khởi động đầu tạo database và dữ liệu trình diễn; không có database cá nhân trong kho GitHub hoặc bản nén mã nguồn.

Kho mã nguồn riêng tư: https://github.com/Nguyendepzai1/tro-xanh . GitHub lưu mã nguồn; website vẫn chạy bằng Node.js và SQLite trên máy.
