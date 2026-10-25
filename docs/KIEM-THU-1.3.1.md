# Biên bản kiểm thử phiên bản 1.3.1

Ngày thực hiện: 25/10/2026. Môi trường Windows, Node.js 24.20.0, SQLite 3.53.4. Các bài tích hợp chạy với máy chủ HTTP và database tạm, tách dữ liệu sử dụng chính.

Lệnh: `node --test tests/*.test.mjs`.

**Kết quả: 98 bài đạt, 0 lỗi, 0 bỏ qua.** Bản ghi đầy đủ: [test-output-v1.3.1.txt](test-output-v1.3.1.txt).

| Nhóm | Số bài | Nội dung |
| --- | ---: | --- |
| Cơ sở | 22 | Đăng nhập, quyền, tin phòng, lịch xem, hợp đồng, hóa đơn |
| Hồi quy | 20 | Kiểu dữ liệu, CSRF, ngày giờ, truy cập chéo, migration |
| Mở rộng | 28 | Minh chứng, hồ sơ, chat, giữ chỗ, cọc, tiền thuê, phí thành công |
| Biên | 8 | CSRF, phân trang chat, giới hạn gửi, tài khoản bị khóa, tệp riêng |
| Cộng đồng và địa chỉ | 20 | So sánh, đánh giá, báo cáo, danh mục toàn quốc |

U28 bổ sung nội dung có nhiều dòng, dòng trống, tiếng Việt và emoji. Hai tài khoản đọc lại đúng chuỗi đã gửi; gửi lại cùng `client_key` trả cùng mã và chỉ lưu một tin.

## Kiểm tra thao tác trên trình duyệt

Thực hiện bằng hai tài khoản demo trên máy chủ kiểm thử `127.0.0.1:3531`, database riêng `work/chat-qa-20261025.db`. Đây là trao đổi thử, không phải tin nhắn khách hàng thật.

| Mã | Thao tác | Quan sát |
| --- | --- | --- |
| GUI CHAT 01 | Nhập dòng đầu, nhấn Enter | Có ký tự xuống dòng; lịch sử chưa thêm tin |
| GUI CHAT 02 | Nhấn Enter nhiều lần, nhập tiếng Việt | Giữ được dòng trống và nội dung nhiều dòng; chưa gửi |
| GUI CHAT 03 | Giữ bản nháp qua nhiều chu kỳ cập nhật lịch sử | Bản nháp nguyên vẹn, không gửi tự động |
| GUI CHAT 04 | Bấm Gửi với bản nháp hợp lệ | Thêm đúng một tin, ô soạn được xóa |
| GUI CHAT 05 | Bấm Gửi khi ô soạn rỗng | Kiểm tra required chặn; không thêm tin |
| GUI CHAT 06 | Chỉ nhập hai dấu xuống dòng rồi bấm Gửi | Máy chủ từ chối, hiện lỗi, giữ bản nháp; nút Gửi hoạt động lại |
| GUI CHAT 07 | Chủ trọ đọc và soạn trả lời với Shift+Enter | Đọc đủ dòng của khách, soạn thêm dòng; chỉ gửi khi bấm nút |
| GUI CHAT 08 | Tải lại hội thoại chủ trọ | Hai tin vẫn đúng người gửi, nội dung và dòng trống |

Tám ca GUI trên đều đạt; được ghi riêng, không cộng vào 98 bài tự động. Log trình duyệt trong luồng này không ghi nhận lỗi hoặc cảnh báo JavaScript. Ảnh: [bản nháp chưa gửi](chat-enter-draft-v1.3.1.png) và [hội thoại sau khi tải lại](chat-newlines-v1.3.1.png).

## Tài liệu bàn giao

Báo cáo `Bao-cao-Scrum-Tro-Xanh.docx` được phát hành riêng cùng mã nguồn, theo bộ mẫu Scrum người dùng cung cấp. Báo cáo gồm Proposal, Project Plan, User Story, Product Backlog, Architecture, UI, Database, Test Plan, Test Case, Test Report, Sprint Backlog, Meeting Report, Configuration Management, Reflection và phụ lục 28 cặp sơ đồ.

Thông tin trường, lớp, giảng viên và thành viên được để ô điền. Bốn Sprint là kế hoạch đề xuất để nhóm điều chỉnh; giờ ước lượng không phải giờ công thực tế. Các biên bản họp, phê duyệt và trải nghiệm cá nhân cần được nhóm ghi nhận theo thực tế.

## Phạm vi kiểm chứng

Đã chạy lại toàn bộ bộ test và kiểm tra thao tác chat nêu trên. Chưa đo tải lớn, chưa thử mọi trình duyệt, mọi bộ gõ tiếng Việt hoặc điện thoại vật lý. Kết quả đạt không có nghĩa mọi tình huống có thể xảy ra đều được kiểm chứng. Các khoản thanh toán vẫn là mô phỏng.
