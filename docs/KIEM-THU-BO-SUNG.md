# Kiểm thử hồi quy Trọ Xanh phiên bản 1.1

Ngày kiểm tra: 23/10/2026. Môi trường Windows, Node.js 24.19.0, SQLite 3.53.3.

## Kết quả

42 bài kiểm thử tự động đều đạt: 22 bài cơ sở và 20 bài hồi quy. Không có bài bị bỏ qua. Bản ghi cuối cùng là `test-output.txt`.

Trước khi sửa, 10/16 tình huống hồi quy đầu tiên không đạt. Đây là các lỗi và hạn chế chưa được bộ kiểm thử ban đầu bao phủ. Sau khi sửa và thêm bốn tình huống nữa, toàn bộ 42 bài đã đạt.

| Mã | Tình huống | Trước sửa | Sau sửa |
| --- | --- | --- | --- |
| R01 | Kiểu boolean, mảng, object trong trường số | Không đạt | Đạt |
| R02 | Số dạng hex, khoảng giá đảo ngược | Không đạt | Đạt |
| R03 | Mật khẩu có dấu cách đầu/cuối | Không đạt | Đạt |
| R04 | Ngày không có thật hoặc chuỗi lịch dư ký tự | Không đạt | Đạt |
| R05 | API công khai không trả trường nội bộ | Không đạt | Đạt |
| R06 | URL mã hóa hỏng trả lỗi có kiểm soát | Không đạt | Đạt |
| R07 | Tìm tiếng Việt không dấu và hoa thường | Không đạt | Đạt |
| R08 | Tìm ký tự % và _ theo nghĩa đen | Không đạt | Đạt |
| R09 | Chặn nối hợp đồng với email chưa đăng ký/sai vai trò | Không đạt | Đạt |
| R10 | Hai yêu cầu tạo hợp đồng đồng thời | Đạt | Đạt |
| R11 | Quyền xem giữ nguyên theo ID khi email thay đổi | Không đạt | Đạt |
| R12 | Hóa đơn đồng thời, bỏ qua tổng tiền client | Đạt | Đạt |
| R13 | Không tự cấp quyền trong payload đăng ký | Đạt | Đạt |
| R14 | JSON hỏng hoặc kiểu dữ liệu gốc sai | Đạt | Đạt |
| R15 | Trang âm, phân số hoặc NaN | Đạt | Đạt |
| R16 | Tách hợp đồng, hóa đơn giữa người tìm phòng | Đạt | Đạt |
| R17 | Migration database cũ và mở lại không trùng | Chưa có | Đạt |
| R18 | CSRF cũ hết hiệu lực sau thay phiên | Chưa có | Đạt |
| R19 | Content-Type và header bảo vệ | Chưa có | Đạt |
| R20 | Chặn đăng nhập sau 15 lần sai | Chưa có | Đạt |

## Thay đổi dữ liệu

Thêm cột `leases.tenant_user_id` tham chiếu `users.id`. Database cũ tự nâng cấp khi mở bằng ứng dụng. Hợp đồng cũ có email khớp với tài khoản seeker đang tồn tại được nối với ID đó. Không xóa hay tạo lại phòng, hợp đồng hoặc hóa đơn. Bản dữ liệu trước nâng cấp đã được sao lưu trong quá trình thực hiện.

Email vẫn là thông tin liên hệ; quyền đọc hợp đồng và hóa đơn dựa trên ID tài khoản. Không có việc một tài khoản đăng ký email sau này tự nhận hợp đồng cũ chưa được liên kết. Chủ trọ có thể để trống email khi chỉ quản lý nội bộ.

## Đối chiếu giao diện sau sửa

- Nhập `hai chau` trên trang chủ trả đúng tin thuộc Hải Châu.
- Người tìm phòng mẫu vẫn xem được hợp đồng phòng số 4 sau migration.
- Hóa đơn cũ giữ nguyên số tiền và trạng thái.
- Giao diện giải thích yêu cầu tài khoản người thuê đã đăng ký.

## Sơ đồ và báo cáo

Word cập nhật có 60 trang, bổ sung danh mục sơ đồ, 14 sơ đồ hoạt động và 14 sơ đồ tuần tự. Mỗi nghiệp vụ có đặc tả điều kiện trước, điều kiện sau, nhánh hợp lệ và nhánh lỗi. PNG độ phân giải cao và mã PlantUML nằm trong `so-do-chi-tiet/`.

## Chạy lại

```powershell
node --test --test-reporter=spec tests/*.test.mjs
```

Các database thử nằm ở thư mục tạm riêng; bộ kiểm thử không sửa dữ liệu người dùng. Kết quả đồng thời là kiểm tra tính nhất quán ở các tình huống cụ thể, không phải đo tải thương mại. Chưa kiểm tra điện thoại thật, thử tải dài hạn hoặc kiểm thử thâm nhập.
